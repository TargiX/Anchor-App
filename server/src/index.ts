import cors from "@fastify/cors"
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify"
import pg from "pg"
import { z } from "zod"
import { createAuth, type AnchorAuth } from "./auth.js"
import { runMigrations } from "./migrate.js"

/**
 * Anchor backend: Better Auth + session-scoped journal state sync.
 *
 * Web clients reach this service same-origin through Vercel rewrites
 * (/api/auth/*, /api/data/*) with cookies. Native clients call it directly
 * with a bearer token. Every data query is scoped to the authenticated
 * session's user id — there is no client-supplied identity.
 */

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? "0.0.0.0"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 8,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
})

const app = Fastify({ logger: true })

// Migrations must land before createAuth: better-auth validates the schema at
// construction and caches the mismatch on every subsequent request.
const applied = await runMigrations(pool)
if (applied.length > 0) {
  app.log.info({ migrations: applied }, "applied migrations")
}

const auth: AnchorAuth = createAuth(pool)

const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

// Capacitor WebViews present these origins; web traffic is same-origin and
// does not need CORS at all.
const NATIVE_ORIGINS = [
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]

await app.register(cors, {
  origin: [...trustedOrigins, ...NATIVE_ORIGINS],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["set-auth-token"],
})

app.get("/health", async (_request, reply) => {
  try {
    await pool.query("select 1")
    return { ok: true, db: "up" }
  } catch {
    return reply.status(503).send({ ok: false, db: "down" })
  }
})

// Account and journal responses must never be stored in browser/shared caches.
app.addHook("onSend", async (request, reply, payload) => {
  if (request.url.startsWith("/api/")) reply.header("Cache-Control", "private, no-store")
  return payload
})

// --- Better Auth mount -------------------------------------------------------

function toFetchRequest(request: FastifyRequest): Request {
  const url = `${request.protocol}://${request.host}${request.raw.url ?? request.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(", ") : value)
  }
  const method = request.method.toUpperCase()
  const hasBody = method !== "GET" && method !== "HEAD"
  return new Request(url, {
    method,
    headers,
    body: hasBody ? JSON.stringify(request.body ?? {}) : undefined,
  })
}

async function sendFetchResponse(reply: FastifyReply, response: Response) {
  reply.status(response.status)
  response.headers.forEach((value, key) => {
    // Fastify owns content-length; forwarding it can truncate streamed bodies.
    if (["content-length", "set-cookie"].includes(key.toLowerCase())) return
    reply.header(key, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length) reply.header("set-cookie", cookies)
  const body = await response.text()
  return reply.send(body)
}

app.route({
  method: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  url: "/api/auth/*",
  handler: async (request, reply) => {
    const response = await auth.handler(toFetchRequest(request))
    return sendFetchResponse(reply, response)
  },
})

// --- Session-scoped data routes ----------------------------------------------

interface SessionUser {
  id: string
}

async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | null> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(", ") : value)
  }
  let session: { user: { id: string } } | null
  try {
    session = await auth.api.getSession({ headers })
  } catch (error) {
    request.log.warn({ err: error }, "getSession failed")
    await reply.status(401).send({ error: "Authentication required" })
    return null
  }
  if (!session?.user?.id) {
    await reply.status(401).send({ error: "Authentication required" })
    return null
  }
  return { id: session.user.id }
}

interface StateRow {
  state: unknown
  updated_at: Date
}

const putStateBody = z.object({
  state: z.record(z.string(), z.unknown()),
  baseUpdatedAt: z.string().optional(),
})

app.get("/api/data/state", async (request, reply) => {
  const user = await requireUser(request, reply)
  if (!user) return reply

  const { rows } = await pool.query<StateRow>(
    'select "state", "updated_at" from "anchor_user_states" where "user_id" = $1',
    [user.id]
  )
  const row = rows[0]
  if (!row) return { state: null }
  return { state: row.state, updatedAt: row.updated_at.toISOString() }
})

app.get("/api/data/state/version", async (request, reply) => {
  const user = await requireUser(request, reply)
  if (!user) return reply

  const { rows } = await pool.query<{ updated_at: Date }>(
    'select "updated_at" from "anchor_user_states" where "user_id" = $1',
    [user.id]
  )
  return { updatedAt: rows[0]?.updated_at.toISOString() ?? null }
})

app.put("/api/data/state", async (request, reply) => {
  const user = await requireUser(request, reply)
  if (!user) return reply

  const parsed = putStateBody.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid state payload" })
  }
  const { state, baseUpdatedAt } = parsed.data

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // Lock the parent row, which exists even before the first state save.
    // Concurrent first writes and updates must use the same version check.
    await client.query('select "id" from "user" where "id" = $1 for update', [user.id])
    const { rows: currentRows } = await client.query<StateRow>(
      'select "state", "updated_at" from "anchor_user_states" where "user_id" = $1',
      [user.id]
    )
    const current = currentRows[0]
    if ((current?.updated_at.toISOString() ?? null) !== (baseUpdatedAt ?? null)) {
      await client.query("ROLLBACK")
      return reply.status(409).send({
        state: current?.state ?? null,
        updatedAt: current?.updated_at.toISOString() ?? null,
      })
    }
    // Millisecond precision matches JSON versions, and strictly increases even
    // when two accepted writes happen within the same clock millisecond.
    const { rows } = await client.query<{ updated_at: Date }>(
      `insert into "anchor_user_states" ("user_id", "state", "updated_at")
       values ($1, $2, date_trunc('milliseconds', clock_timestamp()))
       on conflict ("user_id") do update set "state" = excluded."state",
       "updated_at" = greatest(excluded."updated_at", "anchor_user_states"."updated_at" + interval '1 millisecond')
       returning "updated_at"`,
      [user.id, JSON.stringify(state)]
    )
    await client.query("COMMIT")
    return { updatedAt: rows[0].updated_at.toISOString() }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
})

// --- Boot --------------------------------------------------------------------


try {
  await app.listen({ port: PORT, host: HOST })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}

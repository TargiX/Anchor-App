import { NextResponse } from "next/server"
import {
  createCheckInFromTranscript,
  createImmediateReflection,
  createWeeklyDigest,
  type CheckInKind,
} from "@/lib/anchor-checkin/checkin"
import { appendCheckIn, listCheckIns } from "@/lib/anchor-checkin/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AUTH_CHECK_TIMEOUT_MS = 5000

type CheckInRequest = {
  transcript?: unknown
  kind?: unknown
  durationSec?: unknown
}

function getSupabaseAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { publishableKey, url }
}

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false

  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

type SessionAccess =
  | { error: NextResponse }
  | { userId: string | null }

async function requireSession(request: Request): Promise<SessionAccess> {
  const { publishableKey, url } = getSupabaseAuthConfig()

  // Keep the documented local-only fallback working when Supabase is absent.
  if (!url && !publishableKey) return { userId: null }

  if (!isValidSupabaseUrl(url) || !publishableKey) {
    return {
      error: NextResponse.json(
        { error: "Supabase environment is not configured" },
        { status: 500 }
      ),
    }
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  let response: Response
  try {
    response = await fetch(new URL("/auth/v1/user", url), {
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_CHECK_TIMEOUT_MS),
      headers: {
        apikey: publishableKey,
        Authorization: authHeader,
      },
    })
  } catch {
    return { error: NextResponse.json({ error: "Auth check failed" }, { status: 502 }) }
  }

  if (response.status === 401 || response.status === 403) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!response.ok) {
    return { error: NextResponse.json({ error: "Auth check failed" }, { status: 502 }) }
  }

  const user = (await response.json().catch(() => null)) as { id?: unknown } | null
  if (typeof user?.id !== "string" || user.id.length === 0) {
    return { error: NextResponse.json({ error: "Auth check failed" }, { status: 502 }) }
  }

  return { userId: user.id }
}

function storageOptionsForUser(userId: string | null) {
  if (!userId) return undefined

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return { dir: `data/anchor-checkins/${safeUserId}` }
}

function parseKind(kind: unknown): CheckInKind | undefined {
  if (kind === "morning" || kind === "evening" || kind === "spontaneous") return kind
  return undefined
}

function latestMorningIntention(records: Awaited<ReturnType<typeof listCheckIns>>): string | null {
  return [...records]
    .reverse()
    .find((record) => record.kind === "morning" && record.intention.main)?.intention.main ?? null
}

export async function GET(request: Request) {
  const session = await requireSession(request)
  if ("error" in session) return session.error

  const records = await listCheckIns(storageOptionsForUser(session.userId))
  return NextResponse.json({
    records,
    digest: createWeeklyDigest(records),
  })
}

export async function POST(request: Request) {
  const session = await requireSession(request)
  if ("error" in session) return session.error

  const body = (await request.json().catch(() => null)) as CheckInRequest | null
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : ""
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 })
  }

  const storageOptions = storageOptionsForUser(session.userId)
  const records = await listCheckIns(storageOptions)
  const morningIntention = latestMorningIntention(records)
  const checkIn = createCheckInFromTranscript({
    transcript,
    kind: parseKind(body?.kind),
    durationSec: typeof body?.durationSec === "number" ? body.durationSec : null,
    morningIntention,
  })
  await appendCheckIn(checkIn, storageOptions)

  const morning = records
    .filter((record) => record.kind === "morning" && record.dayKey === checkIn.dayKey)
    .at(-1)

  return NextResponse.json({
    checkIn,
    reflection: createImmediateReflection(checkIn, morning),
    digest: createWeeklyDigest([...records, checkIn]),
  })
}

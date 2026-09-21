import { NextResponse } from "next/server"
import {
  createCheckInFromTranscript,
  createImmediateReflection,
  createWeeklyDigest,
  type CheckInKind,
} from "@/lib/anchor-checkin/checkin"
import { appendCheckIn, listCheckIns } from "@/lib/anchor-checkin/storage"
import {
  getPostHogServerClient,
  postHogRequestContext,
} from "@/lib/analytics/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AUTH_CHECK_TIMEOUT_MS = 5000

type CheckInRequest = {
  transcript?: unknown
  kind?: unknown
  durationSec?: unknown
}

function getBackendUrl(): string | undefined {
  const url = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL
  if (!url) return undefined
  try {
    return new URL(url).protocol === "https:" || new URL(url).hostname === "localhost" || new URL(url).hostname === "127.0.0.1"
      ? url.replace(/\/+$/, "")
      : undefined
  } catch {
    return undefined
  }
}

type SessionAccess = { error: NextResponse } | { userId: string | null }

async function requireSession(request: Request): Promise<SessionAccess> {
  const backendUrl = getBackendUrl()

  // Keep the documented local-only fallback working when no backend exists.
  if (!backendUrl) return { userId: null }

  // Forward the caller's credentials: bearer token (native) or session
  // cookie (web, same-origin via rewrite). The backend resolves the session.
  const headers = new Headers()
  const authorization = request.headers.get("authorization")
  const cookie = request.headers.get("cookie")
  if (authorization) headers.set("authorization", authorization)
  if (cookie) headers.set("cookie", cookie)
  if (!authorization && !cookie) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  let response: Response
  try {
    response = await fetch(`${backendUrl}/api/auth/get-session`, {
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_CHECK_TIMEOUT_MS),
      headers,
    })
  } catch {
    return {
      error: NextResponse.json({ error: "Auth check failed" }, { status: 502 }),
    }
  }

  if (!response.ok) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const session = (await response.json().catch(() => null)) as {
    user?: { id?: unknown } | null
  } | null
  if (typeof session?.user?.id !== "string" || session.user.id.length === 0) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { userId: session.user.id }
}

function storageOptionsForUser(userId: string | null) {
  if (!userId) return undefined

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return { dir: `data/anchor-checkins/${safeUserId}` }
}

function parseKind(kind: unknown): CheckInKind | undefined {
  if (kind === "morning" || kind === "evening" || kind === "spontaneous")
    return kind
  return undefined
}

function latestMorningIntention(
  records: Awaited<ReturnType<typeof listCheckIns>>
): string | null {
  return (
    [...records]
      .reverse()
      .find((record) => record.kind === "morning" && record.intention.main)
      ?.intention.main ?? null
  )
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
  const transcript =
    typeof body?.transcript === "string" ? body.transcript.trim() : ""
  if (!transcript) {
    return NextResponse.json(
      { error: "transcript is required" },
      { status: 400 }
    )
  }

  const storageOptions = storageOptionsForUser(session.userId)
  const records = await listCheckIns(storageOptions)
  const morningIntention = latestMorningIntention(records)
  const checkIn = createCheckInFromTranscript({
    transcript,
    kind: parseKind(body?.kind),
    durationSec:
      typeof body?.durationSec === "number" ? body.durationSec : null,
    morningIntention,
  })
  await appendCheckIn(checkIn, storageOptions)

  const analytics = getPostHogServerClient()
  const analyticsContext = postHogRequestContext(
    request,
    session.userId ?? "anonymous-server-check-in"
  )
  await analytics?.captureImmediate({
    distinctId: analyticsContext.distinctId,
    event: "voice_check_in_completed",
    properties: {
      kind: checkIn.kind,
      authenticated: Boolean(session.userId),
      transcript_length_bucket:
        transcript.length < 100
          ? "short"
          : transcript.length < 500
            ? "medium"
            : "long",
      ...(analyticsContext.sessionId
        ? { $session_id: analyticsContext.sessionId }
        : {}),
    },
  })

  const morning = records
    .filter(
      (record) => record.kind === "morning" && record.dayKey === checkIn.dayKey
    )
    .at(-1)

  return NextResponse.json({
    checkIn,
    reflection: createImmediateReflection(checkIn, morning),
    digest: createWeeklyDigest([...records, checkIn]),
  })
}

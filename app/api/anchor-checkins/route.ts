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

type CheckInRequest = {
  transcript?: unknown
  kind?: unknown
  durationSec?: unknown
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

export async function GET() {
  const records = await listCheckIns()
  return NextResponse.json({
    records,
    digest: createWeeklyDigest(records),
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CheckInRequest | null
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : ""
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 })
  }

  const records = await listCheckIns()
  const morningIntention = latestMorningIntention(records)
  const checkIn = createCheckInFromTranscript({
    transcript,
    kind: parseKind(body?.kind),
    durationSec: typeof body?.durationSec === "number" ? body.durationSec : null,
    morningIntention,
  })
  await appendCheckIn(checkIn)

  const morning = records
    .filter((record) => record.kind === "morning" && record.dayKey === checkIn.dayKey)
    .at(-1)

  return NextResponse.json({
    checkIn,
    reflection: createImmediateReflection(checkIn, morning),
    digest: createWeeklyDigest([...records, checkIn]),
  })
}

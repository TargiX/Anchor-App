import { NextResponse } from "next/server"
import { z } from "zod"
import { DayEntrySchema } from "@/lib/domain/entry"
import { DailyReviewSchema } from "@/lib/domain/daily-review"
import { HabitSchema } from "@/lib/domain/habit"
import { computeDailyAnchor } from "@/lib/domain/daily-anchor"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
const DEFAULT_MODEL = "gpt-4.1-mini"
const UPSTREAM_TIMEOUT_MS = 30_000

const ReviewRequestSchema = z.object({
  entry: DayEntrySchema,
  habits: z.array(HabitSchema).max(12),
  recentEntries: z.array(DayEntrySchema).max(14).default([]),
})

export async function POST(request: Request) {
  const accessToken = getBearerToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const auth = await verifySupabaseUser(accessToken)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI review is not configured" },
      { status: 503 }
    )
  }

  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = ReviewRequestSchema.safeParse(requestBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review payload" },
      { status: 400 }
    )
  }

  const { entry, habits, recentEntries } = parsed.data
  const dailyAnchor = computeDailyAnchor(entry, habits)

  let response: Response
  try {
    response = await fetchWithTimeout(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_DAILY_REVIEW_MODEL ?? DEFAULT_MODEL,
        input: [
          {
            role: "developer",
            content:
              "You write short, calm personal ritual reflections. Do not diagnose, shame, or give medical advice. Ground every claim in the provided data. Keep the language gentle and concrete.",
          },
          {
            role: "user",
            content: JSON.stringify({
              dailyAnchor,
              today: redactForReview(entry),
              recentEntries: recentEntries.map(redactForReview),
              habits: habits.map((habit) => ({
                id: habit.id,
                name: habit.name,
              })),
            }),
          },
        ],
        max_output_tokens: 500,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "anchor_daily_review",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "pattern", "nextStep", "evidence", "tone"],
              properties: {
                summary: {
                  type: "string",
                  description: "One short sentence summarizing the day.",
                },
                pattern: {
                  type: "string",
                  description: "One observed pattern from the provided data.",
                },
                nextStep: {
                  type: "string",
                  description: "One small next action for tomorrow or tonight.",
                },
                evidence: {
                  type: "array",
                  minItems: 1,
                  maxItems: 4,
                  items: { type: "string" },
                },
                tone: {
                  type: "string",
                  enum: ["gentle", "encouraging", "reflective"],
                },
              },
            },
          },
        },
        user: auth.userId,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Upstream request timed out"
            ? "AI review timed out"
            : "AI review failed",
      },
      { status: 502 }
    )
  }

  let body: unknown
  let outputText: string
  try {
    body = await response.json()
    if (!response.ok) {
      const upstream =
        body &&
        typeof body === "object" &&
        "error" in body &&
        body.error &&
        typeof body.error === "object" &&
        "message" in body.error &&
        typeof body.error.message === "string"
          ? body.error.message
          : undefined
      return NextResponse.json(
        { error: "AI review failed", upstream },
        { status: 502 }
      )
    }
    outputText = extractOutputText(body)
  } catch {
    return NextResponse.json(
      { error: "AI review returned an unreadable response" },
      { status: 502 }
    )
  }

  let outputJson: unknown
  try {
    outputJson = JSON.parse(outputText)
  } catch {
    return NextResponse.json(
      { error: "AI review returned invalid JSON" },
      { status: 502 }
    )
  }

  const review = DailyReviewSchema.safeParse(outputJson)

  if (!review.success) {
    return NextResponse.json(
      { error: "AI review returned an unexpected shape" },
      { status: 502 }
    )
  }

  return NextResponse.json({ review: review.data })
}

async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit,
  timeoutMs = UPSTREAM_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upstream request timed out")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length).trim() || null
}

async function verifySupabaseUser(
  accessToken: string
): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { ok: false, status: 500, error: "Supabase is not configured" }
  }

  let response: Response
  try {
    response = await fetchWithTimeout(new URL("/auth/v1/user", url), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error && error.message === "Upstream request timed out"
          ? "Auth verification timed out"
          : "Auth verification failed",
    }
  }

  if (!response.ok) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const user = (await response.json()) as { id?: string }
  if (!user.id) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  return { ok: true, userId: user.id }
}

function redactForReview(entry: z.infer<typeof DayEntrySchema>) {
  return {
    date: entry.date,
    morningMood: entry.morningMood,
    eveningMood: entry.eveningMood,
    sleepQuality: entry.sleepQuality,
    sleepHours: entry.sleepHours,
    intention: entry.intention,
    journal: entry.journal,
    habitsCompleted: entry.habitsCompleted,
    meditationMinutes: entry.meditationMinutes,
    tomorrowBedtime: entry.tomorrowBedtime,
    tomorrowSleepHours: entry.tomorrowSleepHours,
  }
}

function extractOutputText(response: unknown): string {
  if (
    response &&
    typeof response === "object" &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text
  }

  const output = (response as { output?: unknown[] })?.output ?? []
  for (const item of output) {
    const content = (item as { content?: unknown[] })?.content ?? []
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "output_text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text
      }
    }
  }

  throw new Error("Missing OpenAI output text")
}

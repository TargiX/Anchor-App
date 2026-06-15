import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const PING_TIMEOUT_MS = 8_000

function getSupabaseConfig() {
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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured", ok: false },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized", ok: false },
      { status: 401 }
    )
  }

  const { publishableKey, url } = getSupabaseConfig()

  if (!isValidSupabaseUrl(url) || !publishableKey) {
    return NextResponse.json(
      { error: "Supabase environment is not configured", ok: false },
      { status: 500 }
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

  try {
    const pingUrl = new URL("/rest/v1/anchor_user_states", url)
    pingUrl.searchParams.set("select", "user_id")
    pingUrl.searchParams.set("limit", "1")

    const response = await fetch(pingUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${publishableKey}`,
        apikey: publishableKey,
      },
      signal: controller.signal,
    })

    const body = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Supabase keepalive failed",
          ok: false,
          status: response.status,
          upstream: body.slice(0, 500),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      ok: true,
      status: response.status,
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError"

    return NextResponse.json(
      {
        error: timedOut ? "Supabase keepalive timed out" : "Supabase ping failed",
        ok: false,
      },
      { status: timedOut ? 504 : 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}

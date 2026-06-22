"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppState, useDailyReviewUi } from "@/hooks/use-store"
import { useAuth } from "@/components/auth-provider"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Clock,
  BookOpen,
  Flame,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getTimeContext, getGreeting, getTimeLabel } from "@/lib/time/context"
import { isMorningComplete, isEveningComplete, computeStreak } from "@/lib/domain/selectors"
import { computeDailyAnchor } from "@/lib/domain/daily-anchor"
import { DailyReviewSchema } from "@/lib/domain/daily-review"
import { emptyEntry, type DayEntry } from "@/lib/domain/entry"
import {
  startDailyReviewGeneration,
  setDailyReviewSuccess,
  setDailyReviewFailure,
} from "@/lib/store/actions"
import { getTodayKey } from "@/lib/time/today"
import { supabase } from "@/lib/supabase/client"

function useTimeInfo() {
  const [time, setTime] = useState<{ mounted: boolean; hour: number }>({
    mounted: false,
    hour: 12, // Default to midday for SSR
  })

  useEffect(() => {
    // Intentional post-hydration setState: SSR renders with a fixed default
    // (midday) and only after mount do we read the real client time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime({ mounted: true, hour: new Date().getHours() })
  }, [])

  const { mounted, hour } = time

  const dateStr = mounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  return {
    mounted,
    timeContext: getTimeContext(hour),
    greeting: getGreeting(hour),
    timeLabel: getTimeLabel(hour),
    dateStr,
  }
}

export default function Home() {
  const router = useRouter()
  const { status: authStatus } = useAuth()
  const state = useAppState()
  const todayKey = getTodayKey()
  const today = state.entries[todayKey] ?? emptyEntry(todayKey)
  const streak = computeStreak(state.entries)
  const { review, reviewError, reviewLoading } = useDailyReviewUi()
  const { mounted, timeContext, greeting, timeLabel, dateStr } = useTimeInfo()

  // Settings is still under the (protected) layout and bounces anon users to
  // /login, so hide the shortcut for guests — they have no settings to tweak
  // until they sign in (the post-ritual save-prompt already covers that).
  const isAuthed = authStatus === "authed"

  const morningDone = isMorningComplete(today)
  const eveningDone = isEveningComplete(today)
  const dailyAnchor = computeDailyAnchor(today, state.habits)

  const ctaLabel =
    timeContext === "morning"
      ? morningDone
        ? "Review this morning"
        : "Start morning ritual"
      : timeContext === "evening"
        ? eveningDone
          ? "Review this evening"
          : "Begin evening ritual"
        : null

  const ctaRoute =
    timeContext === "morning" || timeContext === "midday"
      ? "/morning"
      : "/evening"

  async function handleGenerateReview() {
    startDailyReviewGeneration()

    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: null }
      const token = data?.session?.access_token

      if (!token) {
        setDailyReviewFailure("Sign in to generate an AI review.")
        return
      }

      const response = await fetch("/api/ai/daily-review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entry: today,
          habits: state.habits,
          recentEntries: recentEntries(state.entries),
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        setDailyReviewFailure(
          response.status === 503
            ? "AI review is ready in the app, but the API key is not configured yet."
            : (body?.error ?? "Could not generate a review.")
        )
        return
      }

      const parsed = DailyReviewSchema.safeParse(body.review)
      if (!parsed.success) {
        setDailyReviewFailure("Could not generate a review.")
        return
      }

      setDailyReviewSuccess(parsed.data)
    } catch {
      setDailyReviewFailure("Could not generate a review.")
    }
  }

  // Avoid hydration mismatch by not rendering time-dependent content until mounted
  if (!mounted) {
    return (
      <main className="min-h-dvh px-6 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto flex max-w-md flex-col lg:grid lg:min-h-[calc(100dvh-5rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-12">
          <div className="pt-2 lg:pt-0">
            <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
            <div className="mt-2 h-9 w-48 animate-pulse rounded bg-muted/50 lg:h-14 lg:w-72" />
            <div className="mt-8 size-[120px] animate-pulse rounded-full bg-muted/30 lg:size-[220px]" />
          </div>
          <div className="mt-8 h-80 animate-pulse rounded-[2rem] border border-border bg-card/60 lg:mt-0" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh px-6 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-md flex-col lg:grid lg:min-h-[calc(100dvh-5rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-12 xl:grid-cols-[minmax(0,1fr)_480px]">
        <section className="flex flex-col">
          <header className="flex items-center justify-between pb-2 lg:pb-0">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {dateStr}
              </p>
              <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground lg:mt-3 lg:max-w-xl lg:text-6xl lg:leading-[1.05]">
                {greeting}.
              </h1>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </button>
          </header>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 py-8 lg:items-start lg:gap-5 lg:py-12"
          >
            <AnchorMotif size={120} className="text-primary lg:hidden" />
            <AnchorMotif
              size={240}
              className="hidden text-primary opacity-80 lg:block"
            />
            <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 lg:px-4 lg:py-2">
              <Flame className="size-3.5 text-accent lg:size-4" />
              <span className="text-xs text-muted-foreground lg:text-sm">
                <span className="font-medium text-foreground">{streak}</span>{" "}
                day streak
              </span>
            </div>
          </motion.div>

          <p className="hidden max-w-md font-[family-name:var(--font-display)] text-lg leading-8 text-muted-foreground italic lg:block">
            A quiet place to begin, close, and notice the shape of the day.
          </p>
        </section>

        <section className="rounded-none lg:rounded-[2rem] lg:border lg:border-border/80 lg:bg-card/55 lg:p-7 lg:shadow-sm">
          <div className="hidden items-center justify-between pb-6 lg:flex">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Today
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground">
                {timeLabel}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              className="rounded-xl"
              onClick={() => router.push("/settings")}
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 lg:mb-5 lg:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Daily Anchor
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-foreground lg:text-2xl">
                  {dailyAnchor.headline}
                </h2>
              </div>
              <div
                className="grid size-14 shrink-0 place-items-center rounded-full border border-primary/20 bg-card/75 font-[family-name:var(--font-display)] text-lg font-semibold text-primary"
                aria-label={`Daily Anchor score ${dailyAnchor.score} of 100`}
              >
                {dailyAnchor.score}
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {dailyAnchor.summary}
            </p>

            <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border/50 overflow-hidden rounded-xl border border-border/40">
              {dailyAnchor.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.68rem] font-medium tracking-widest text-muted-foreground uppercase">
                      {metric.label}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {metric.value}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-background/55 px-3 py-2.5">
              <p className="text-xs leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Next:</span>{" "}
                {dailyAnchor.nextStep}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-2.5 text-xs"
                disabled={reviewLoading}
                onClick={handleGenerateReview}
              >
                <Sparkles className="size-3.5" data-icon="inline-start" />
                {reviewLoading ? "Reading" : "AI review"}
              </Button>
            </div>

            {(review || reviewError) && (
              <div className="mt-3 rounded-xl border border-border/70 bg-card/65 px-4 py-3">
                {review ? (
                  <div className="space-y-2">
                    <p className="font-[family-name:var(--font-display)] text-sm leading-relaxed text-foreground italic">
                      {review.summary}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {review.pattern}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Suggested:
                      </span>{" "}
                      {review.nextStep}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {reviewError}
                  </p>
                )}
              </div>
            )}
          </motion.div>

          <div className="flex flex-col gap-2.5 lg:gap-3">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <button
                onClick={() => router.push("/morning")}
                aria-label="Open morning ritual"
                className={cn(
                  "group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all hover:translate-x-0.5 active:scale-[0.99] lg:px-6 lg:py-5",
                  morningDone
                    ? "border-accent/30 bg-accent/5 hover:border-accent/50"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-2 rounded-full lg:size-2.5",
                      morningDone ? "bg-accent" : "bg-border"
                    )}
                  />
                  <span className="text-sm font-medium text-foreground lg:text-base">
                    Morning ritual
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {morningDone ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-xs font-normal"
                    >
                      Complete
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not started
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
            >
              <button
                onClick={() => router.push("/evening")}
                aria-label="Open evening ritual"
                className={cn(
                  "group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all hover:translate-x-0.5 active:scale-[0.99] lg:px-6 lg:py-5",
                  eveningDone
                    ? "border-accent/30 bg-accent/5 hover:border-accent/50"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-2 rounded-full lg:size-2.5",
                      eveningDone ? "bg-accent" : "bg-border"
                    )}
                  />
                  <span className="text-sm font-medium text-foreground lg:text-base">
                    Evening ritual
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {eveningDone ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-xs font-normal"
                    >
                      Complete
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {timeContext === "morning" ? "Tonight" : "Not started"}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </button>
            </motion.div>
          </div>

          <div className="my-5 lg:my-6">
            <Separator />
          </div>

          {timeContext !== "midday" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                className="h-14 w-full rounded-2xl text-base font-medium lg:h-16"
                onClick={() => router.push(ctaRoute)}
              >
                <Clock className="size-4" data-icon="inline-start" />
                {ctaLabel ?? timeLabel}
              </Button>
            </motion.div>
          )}

          {timeContext === "midday" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="px-2 text-center font-[family-name:var(--font-display)] text-sm leading-relaxed text-muted-foreground italic"
            >
              The day is yours. Check in when you&apos;re ready.
            </motion.p>
          )}

          <div className="mt-3 flex gap-3 lg:mt-4">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-xl text-sm"
              onClick={() => router.push("/timeline")}
            >
              <BookOpen className="size-4" data-icon="inline-start" />
              Timeline
            </Button>
            {isAuthed ? (
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl text-sm"
                onClick={() => router.push("/settings")}
              >
                <Settings className="size-4" data-icon="inline-start" />
                Settings
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl text-sm"
                onClick={() => router.push("/login?mode=signup")}
              >
                <Sparkles className="size-4" data-icon="inline-start" />
                Save progress
              </Button>
            )}
          </div>

          {today.intention && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 rounded-2xl border border-border bg-card/50 px-5 py-4 lg:mt-5"
            >
              <p className="mb-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Today&apos;s intention
              </p>
              <p className="font-[family-name:var(--font-display)] text-sm leading-relaxed text-foreground italic lg:text-base">
                &ldquo;{today.intention}&rdquo;
              </p>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  )
}

function recentEntries(entries: Record<string, DayEntry>): DayEntry[] {
  return Object.values(entries)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
}

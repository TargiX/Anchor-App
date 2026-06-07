"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTodayEntry, useStreak } from "@/hooks/use-store"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, Clock, BookOpen, Flame, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getTimeContext, getGreeting, getTimeLabel } from "@/lib/time/context"
import { isMorningComplete, isEveningComplete } from "@/lib/domain/selectors"

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
  const today = useTodayEntry()
  const streak = useStreak()
  const { mounted, timeContext, greeting, timeLabel, dateStr } = useTimeInfo()

  const morningDone = isMorningComplete(today)
  const eveningDone = isEveningComplete(today)

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
    timeContext === "morning" || timeContext === "midday" ? "/morning" : "/evening"

  // Avoid hydration mismatch by not rendering time-dependent content until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col min-h-dvh max-w-md mx-auto px-6">
        <div className="pt-10 pb-2">
          <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
          <div className="h-7 w-40 bg-muted/50 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="size-[120px] bg-muted/30 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto px-6">
      {/* Header */}
      <header className="flex items-center justify-between pt-10 pb-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {dateStr}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground mt-0.5">
            {greeting}.
          </h1>
        </div>
        <button
          onClick={() => router.push("/settings")}
          className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>
      </header>

      {/* Brand motif + streak */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center py-8 gap-3"
      >
        <AnchorMotif size={120} className="text-primary" />
        <div className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-accent" />
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{streak}</span> day streak
          </span>
        </div>
      </motion.div>

      {/* Ritual status — entire card is the entry point */}
      <div className="flex flex-col gap-2.5">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
        <button
          onClick={() => router.push("/morning")}
          aria-label="Open morning ritual"
          className={cn(
            "group w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all hover:translate-x-0.5 active:scale-[0.99]",
            morningDone
              ? "border-accent/30 bg-accent/5 hover:border-accent/50"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-2 rounded-full",
                morningDone ? "bg-accent" : "bg-border"
              )}
            />
            <span className="text-sm font-medium text-foreground">Morning ritual</span>
          </div>
          <div className="flex items-center gap-2">
            {morningDone ? (
              <Badge variant="secondary" className="text-xs font-normal rounded-full">
                Complete
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Not started</span>
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
            "group w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all hover:translate-x-0.5 active:scale-[0.99]",
            eveningDone
              ? "border-accent/30 bg-accent/5 hover:border-accent/50"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-2 rounded-full",
                eveningDone ? "bg-accent" : "bg-border"
              )}
            />
            <span className="text-sm font-medium text-foreground">Evening ritual</span>
          </div>
          <div className="flex items-center gap-2">
            {eveningDone ? (
              <Badge variant="secondary" className="text-xs font-normal rounded-full">
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

      <div className="my-5">
        <Separator />
      </div>

      {/* Main CTA — only in morning/evening contexts; midday relies on the clickable cards */}
      {timeContext !== "midday" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            className="w-full rounded-2xl h-14 text-base font-medium"
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
          className="text-center text-sm text-muted-foreground font-[family-name:var(--font-display)] italic leading-relaxed px-2"
        >
          The day is yours. Check in when you&apos;re ready.
        </motion.p>
      )}

      {/* Secondary links */}
      <div className="flex gap-3 mt-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-12 text-sm"
          onClick={() => router.push("/timeline")}
        >
          <BookOpen className="size-4" data-icon="inline-start" />
          Timeline
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-12 text-sm"
          onClick={() => router.push("/settings")}
        >
          <Settings className="size-4" data-icon="inline-start" />
          Settings
        </Button>
      </div>

      {/* Today's intention */}
      {today.intention && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 rounded-2xl border border-border bg-card/50 px-5 py-4"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
            Today&apos;s intention
          </p>
          <p className="text-sm text-foreground font-[family-name:var(--font-display)] italic leading-relaxed">
            &ldquo;{today.intention}&rdquo;
          </p>
        </motion.div>
      )}

      <div className="pb-10" />
    </div>
  )
}

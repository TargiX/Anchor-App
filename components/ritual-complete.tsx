"use client"

import { motion, useReducedMotion } from "framer-motion"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { useStreak } from "@/hooks/use-store"
import { captureEvent } from "@/lib/analytics/client"

interface RitualCompleteProps {
  kind: "morning" | "evening"
  onDone: () => void
}

const COPY = {
  morning: {
    eyebrow: "Morning ritual",
    title: "The day is anchored.",
    body: "Take this with you.",
    cta: "Into the day",
  },
  evening: {
    eyebrow: "Evening ritual",
    title: "The day is closed.",
    body: "Everything is set down.",
    cta: "Toward rest",
  },
} as const

export function RitualComplete({ kind, onDone }: RitualCompleteProps) {
  const streak = useStreak()
  const copy = COPY[kind]
  const shouldReduceMotion = useReducedMotion()
  const drift = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }

  function finishRitual() {
    captureEvent("ritual_completed", { kind, streak })
    onDone()
  }

  return (
    <div className="ritual-atmosphere flex min-h-app flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.14 }
        }
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0.4 : 1.1,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex flex-col items-center"
      >
        {/* The anchor settling into place, then breathing */}
        <AnchorMotif size={168} animate className="text-primary opacity-80" />
      </motion.div>

      <motion.p
        initial={drift}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="mt-8 text-xs font-medium text-muted-foreground"
      >
        {copy.eyebrow} &middot; complete
      </motion.p>

      <motion.h1
        initial={drift}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7 }}
        className="mt-3 max-w-sm font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl"
      >
        {copy.title}
      </motion.h1>

      <motion.p
        initial={drift}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.7 }}
        className="mt-4 max-w-xs text-sm leading-7 text-balance text-muted-foreground"
      >
        {copy.body}
      </motion.p>

      {streak > 0 ? (
        <motion.p
          initial={drift}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-6 text-sm text-muted-foreground"
        >
          {streak} {streak === 1 ? "day" : "days"} in a row
        </motion.p>
      ) : null}

      <motion.div
        initial={drift}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="mt-10 w-full max-w-xs"
      >
        <Button
          onClick={finishRitual}
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {copy.cta}
        </Button>
      </motion.div>
    </div>
  )
}

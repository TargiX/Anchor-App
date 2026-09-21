"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { motion, useReducedMotion } from "framer-motion"
import { getGreeting } from "@/lib/time/context"
import { updateEntry } from "@/lib/store/actions"
import type { DayKey } from "@/lib/domain/entry"
import { captureEvent } from "@/lib/analytics/client"

const AFFIRMATIONS = [
  "You are allowed to begin again, quietly and without apology.",
  "Today you bring enough — exactly as you are.",
  "Your presence is the gift. Everything else follows.",
  "What needs your attention today already knows you are coming.",
  "Stillness is not the absence of movement. It is its root.",
  "Each breath is a small act of faith in what is possible.",
  "You do not need to earn rest. It is yours already.",
  "The day holds more space for you than you think.",
]

interface StepAffirmationProps {
  entryKey: DayKey
  onNext: () => void
  onBack: () => void
  userName?: string
}



export function StepAffirmation({
  entryKey,
  onNext,
  onBack,
  userName,
}: StepAffirmationProps) {
  const [index, setIndex] = useState(0)
  const [greeting, setGreeting] = useState(getGreeting(12))
  const shouldReduceMotion = useReducedMotion()

  /* eslint-disable react-hooks/set-state-in-effect -- hydration guard: client-only greeting and random affirmation must not affect the first client render */
  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()))
    setIndex(Math.floor(Math.random() * AFFIRMATIONS.length))
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function regenerate() {
    captureEvent("affirmation_regenerated")
    setIndex((prev) => (prev + 1) % AFFIRMATIONS.length)
  }

  function beginRitual() {
    updateEntry(entryKey, { affirmation: AFFIRMATIONS[index] })
    captureEvent("morning_ritual_started")
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Header — one line, not two competing greetings */}
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-snug font-semibold tracking-tight text-balance text-foreground">
          {greeting}
          {userName ? `, ${userName}` : ""}.
        </h1>
      </div>

      {/* Affirmation */}
      <div className="flex flex-1 flex-col justify-start pt-2">
        <motion.p
          key={index}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.35 }}
          className="font-[family-name:var(--font-display)] text-2xl leading-snug text-balance text-foreground lg:text-3xl"
        >
          &ldquo;{AFFIRMATIONS[index]}&rdquo;
        </motion.p>
        <button
          onClick={regenerate}
          className="mt-5 inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground active:opacity-60"
          aria-label="Show a different affirmation"
        >
          A different one
        </button>
      </div>

      {/* CTA */}
      <div className="mt-auto flex gap-3 pb-10">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-14 flex-none rounded-2xl px-6"
        >
          Back
        </Button>
        <Button
          onClick={beginRitual}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnchorMotif } from "@/components/anchor-motif"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { getGreeting } from "@/lib/time/context"

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
  onNext: () => void
  userName?: string
}

function getDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export function StepAffirmation({ onNext, userName }: StepAffirmationProps) {
  const [index, setIndex] = useState(0)
  const [dateLabel, setDateLabel] = useState("Today")
  const [greeting, setGreeting] = useState(getGreeting(12))
  const [spinning, setSpinning] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- hydration guard: client-only date and random affirmation must not affect the first client render */
  useEffect(() => {
    setDateLabel(getDate())
    setGreeting(getGreeting(new Date().getHours()))
    setIndex(Math.floor(Math.random() * AFFIRMATIONS.length))
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function regenerate() {
    setSpinning(true)
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % AFFIRMATIONS.length)
      setSpinning(false)
    }, 400)
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 pt-4">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {dateLabel}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-snug font-semibold text-balance text-foreground">
          {greeting}
          {userName ? `, ${userName}` : ""}.
        </h1>
      </div>

      {/* Brand motif */}
      <div className="flex justify-center">
        <AnchorMotif size={140} className="text-primary opacity-70 lg:hidden" />
        <AnchorMotif
          size={180}
          className="hidden text-primary opacity-70 lg:block"
        />
      </div>

      {/* Affirmation card */}
      <div className="relative rounded-2xl border border-border bg-card px-6 py-7">
        <p className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Today&apos;s affirmation
        </p>
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="font-[family-name:var(--font-display)] text-xl leading-relaxed text-balance text-foreground"
        >
          &ldquo;{AFFIRMATIONS[index]}&rdquo;
        </motion.p>
        <button
          onClick={regenerate}
          className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Generate another affirmation"
        >
          <RefreshCw
            className={cn(
              "size-3.5 transition-transform duration-500",
              spinning && "rotate-180"
            )}
          />
          another one
        </button>
      </div>

      {/* CTA */}
      <div className="mt-auto pb-10">
        <Button
          onClick={onNext}
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Begin the ritual
        </Button>
      </div>
    </div>
  )
}

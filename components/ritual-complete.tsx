"use client"

import { motion } from "framer-motion"
import { Flame } from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { useStreak } from "@/hooks/use-store"

interface RitualCompleteProps {
  kind: "morning" | "evening"
  onDone: () => void
}

const COPY = {
  morning: {
    eyebrow: "Morning ritual",
    title: "The day is anchored.",
    body: "You showed up before the noise. Carry this quiet with you.",
    cta: "Into the day",
  },
  evening: {
    eyebrow: "Evening ritual",
    title: "The day is closed.",
    body: "Everything is set down. Rest is the last, easiest step.",
    cta: "Toward rest",
  },
} as const

export function RitualComplete({ kind, onDone }: RitualCompleteProps) {
  const streak = useStreak()
  const copy = COPY[kind]

  return (
    <div className="ritual-atmosphere flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 1.14 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        {/* The anchor settling into place, then breathing */}
        <AnchorMotif size={168} animate className="text-primary opacity-80" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="mt-8 text-xs font-medium tracking-widest text-muted-foreground uppercase"
      >
        {copy.eyebrow} &middot; complete
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7 }}
        className="mt-3 max-w-sm font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl"
      >
        {copy.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.7 }}
        className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground text-balance"
      >
        {copy.body}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="mt-7 flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-4 py-2"
      >
        <Flame className="size-4 text-accent" />
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{streak}</span> day streak
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="mt-10 w-full max-w-xs"
      >
        <Button
          onClick={onDone}
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {copy.cta}
        </Button>
      </motion.div>
    </div>
  )
}

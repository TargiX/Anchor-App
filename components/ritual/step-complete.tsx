"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AnchorMotif } from "@/components/anchor-motif"
import { useAuth } from "@/components/auth-provider"

type RitualVariant = "morning" | "evening"

interface StepCompleteProps {
  variant: RitualVariant
  onNext: () => void
  onBack: () => void
}

const COPY: Record<
  RitualVariant,
  { title: string; subtitle: string; cta: string }
> = {
  morning: {
    title: "You're anchored.",
    subtitle: "Into the rest of the day.",
    cta: "Back to app",
  },
  evening: {
    title: "Day closed.",
    subtitle: "Rest is next.",
    cta: "Done",
  },
}

export function StepComplete({ variant, onNext, onBack }: StepCompleteProps) {
  const { status } = useAuth()
  const copy = COPY[variant]
  const shouldReduceMotion = useReducedMotion()
  // Show the save-prompt only to anonymous visitors: their progress is already
  // saved locally (see SyncProvider), this just nudges them toward cloud sync.
  const showSavePrompt = status === "anon"

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pt-4 text-center">
        <motion.div
          initial={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }
          }
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0.2 : 0.6,
            ease: "easeOut",
          }}
        >
          <AnchorMotif size={120} className="text-primary" />
        </motion.div>
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-medium text-balance text-foreground">
            {copy.title}
          </h2>
          <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {showSavePrompt && (
        <p className="text-center text-sm leading-6 text-muted-foreground">
          <Link href="/login?mode=signin" className="text-foreground underline">
            Sign in
          </Link>{" "}
          if you want this on other devices.
        </p>
      )}

      {/* Nav */}
      <div className="mt-auto flex gap-3 pb-10">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-14 flex-none rounded-2xl px-6"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          {copy.cta}
        </Button>
      </div>
    </div>
  )
}

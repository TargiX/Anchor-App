"use client"

import Link from "next/link"
import { motion } from "framer-motion"
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
    subtitle: "The thread is set. Carry it gently into the day.",
    cta: "Back to app",
  },
  evening: {
    title: "Day closed.",
    subtitle: "You closed the loop. Rest now — tomorrow begins fresh.",
    cta: "Done",
  },
}

export function StepComplete({ variant, onNext, onBack }: StepCompleteProps) {
  const { status } = useAuth()
  const copy = COPY[variant]
  // Show the save-prompt only to anonymous visitors: their progress is already
  // saved locally (see SyncProvider), this just nudges them toward cloud sync.
  const showSavePrompt = status === "anon"

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AnchorMotif size={120} className="text-primary" />
        </motion.div>
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium text-foreground text-balance leading-tight">
            {copy.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-[280px]">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {showSavePrompt && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4 flex flex-col gap-3 text-center"
        >
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-medium">Want to save your progress</span>{" "}
            <span className="text-muted-foreground">
              across devices and never lose a ritual?
            </span>
          </p>
          <div className="flex gap-2.5">
            <Link href="/login?mode=signup" className="flex-1">
              <Button className="w-full rounded-2xl h-12 text-sm font-medium">
                Create account
              </Button>
            </Link>
            <Link href="/login?mode=signin" className="flex-1">
              <Button
                variant="outline"
                className="w-full rounded-2xl h-12 text-sm font-medium"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-none rounded-2xl h-14 px-6"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          {copy.cta}
        </Button>
      </div>
    </div>
  )
}

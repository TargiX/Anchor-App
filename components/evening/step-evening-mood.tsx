"use client"

import { StepMood } from "@/components/morning/step-mood"
import { useEntry } from "@/hooks/use-store"

interface StepEveningMoodProps {
  entryKey: string
  onNext: () => void
  onBack: () => void
}

export function StepEveningMood({
  entryKey,
  onNext,
  onBack,
}: StepEveningMoodProps) {
  const today = useEntry(entryKey)
  const morningMood = today?.morningMood

  return (
    <div className="flex flex-1 flex-col gap-4">
      {morningMood ? (
        <p className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
          <span
            className="size-2.5 rounded-full bg-accent"
            style={{ opacity: 0.4 + morningMood.energy * 0.6 }}
            aria-hidden
          />
          This morning&apos;s mood
        </p>
      ) : null}
      <StepMood
        entryKey={entryKey}
        onNext={onNext}
        onBack={onBack}
        isMorning={false}
      />
    </div>
  )
}

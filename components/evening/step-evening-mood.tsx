"use client"

import { StepMood } from "@/components/morning/step-mood"
import { useAppState } from "@/hooks/use-store"
import { getTodayKey, type MoodPoint } from "@/lib/store"

interface StepEveningMoodProps {
  onNext: () => void
  onBack: () => void
}

function MoodDot({ point, label }: { point?: MoodPoint; label: string }) {
  if (!point) return null
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-2.5 rounded-full bg-accent"
        style={{ opacity: 0.4 + point.energy * 0.6 }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function StepEveningMood({ onNext, onBack }: StepEveningMoodProps) {
  const state = useAppState()
  const todayKey = getTodayKey()
  const today = state.entries[todayKey]
  const morningMood = today?.morningMood

  return (
    <div className="flex flex-col flex-1 gap-4">
      {morningMood && (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-3 flex items-center gap-4">
          <div className="text-xs text-muted-foreground">This morning&apos;s mood</div>
          <div
            className="size-3 rounded-full bg-accent"
            style={{
              opacity: 0.4 + morningMood.energy * 0.6,
            }}
          />
          <MoodDot point={morningMood} label="" />
        </div>
      )}
      <StepMood onNext={onNext} onBack={onBack} isMorning={false} />
    </div>
  )
}

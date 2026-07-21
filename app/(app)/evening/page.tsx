"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RitualShell } from "@/components/ritual-shell"
import { RitualComplete } from "@/components/ritual-complete"
import { StepEveningMood } from "@/components/evening/step-evening-mood"
import { StepJournal } from "@/components/evening/step-journal"
import { StepHabits } from "@/components/evening/step-habits"
import { StepSleepTarget } from "@/components/evening/step-sleep-target"
import { StepComplete } from "@/components/ritual/step-complete"
import { useEntry } from "@/hooks/use-store"
import { clearRitualCursor, setRitualCursor } from "@/lib/store/actions"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

const TOTAL_STEPS = LIMITS.eveningRitualSteps

export default function EveningRitual() {
  const [entryKey] = useState(getTodayKey)
  const entry = useEntry(entryKey)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const step = entry.eveningRitualStep ?? 0

  function next() {
    if (step < TOTAL_STEPS - 1) setRitualCursor("evening", step + 1, entryKey)
    else {
      clearRitualCursor("evening", entryKey)
      setDone(true)
    }
  }

  function back() {
    if (step > 0) setRitualCursor("evening", step - 1, entryKey)
    else router.push("/app")
  }

  if (done) {
    return <RitualComplete kind="evening" onDone={() => router.push("/app")} />
  }

  return (
    <RitualShell
      step={step}
      totalSteps={TOTAL_STEPS}
      title="Evening ritual"
      description="Close the loop with mood, reflection, habits, and tomorrow's sleep target."
    >
      {step === 0 && <StepEveningMood entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 1 && <StepJournal entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 2 && <StepHabits entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 3 && <StepSleepTarget entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 4 && (
        <StepComplete variant="evening" onNext={next} onBack={back} />
      )}
    </RitualShell>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RitualShell } from "@/components/ritual-shell"
import { RitualComplete } from "@/components/ritual-complete"
import { StepAffirmation } from "@/components/morning/step-affirmation"
import { StepSleep } from "@/components/morning/step-sleep"
import { StepMood } from "@/components/morning/step-mood"
import {
  getIntentionSuggestions,
  StepIntention,
} from "@/components/morning/step-intention"
import { StepMeditation } from "@/components/morning/step-meditation"
import { StepComplete } from "@/components/ritual/step-complete"
import { useEntry } from "@/hooks/use-store"
import { clearRitualCursor, setRitualCursor } from "@/lib/store/actions"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

const TOTAL_STEPS = LIMITS.morningRitualSteps

export default function MorningRitual() {
  const [entryKey] = useState(getTodayKey)
  const entry = useEntry(entryKey)
  const [done, setDone] = useState(false)
  const [intentionSuggestions] = useState(getIntentionSuggestions)
  const router = useRouter()
  const step = entry.morningRitualStep ?? 0

  function next() {
    if (step < TOTAL_STEPS - 1) setRitualCursor("morning", step + 1, entryKey)
    else {
      clearRitualCursor("morning", entryKey)
      setDone(true)
    }
  }

  function back() {
    if (step > 0) setRitualCursor("morning", step - 1, entryKey)
    else router.push("/app")
  }

  if (done) {
    return <RitualComplete kind="morning" onDone={() => router.push("/app")} />
  }

  return (
    <RitualShell
      step={step}
      totalSteps={TOTAL_STEPS}
      title="Morning ritual"
      description="Start with sleep, mood, intention, and a short stillness practice before the day gets loud."
    >
      {step === 0 && <StepAffirmation entryKey={entryKey} onNext={next} />}
      {step === 1 && <StepSleep entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 2 && <StepMood entryKey={entryKey} onNext={next} onBack={back} isMorning />}
      {step === 3 && (
        <StepIntention
          entryKey={entryKey}
          suggestions={intentionSuggestions}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && <StepMeditation entryKey={entryKey} onNext={next} onBack={back} />}
      {step === 5 && (
        <StepComplete variant="morning" onNext={next} onBack={back} />
      )}
    </RitualShell>
  )
}

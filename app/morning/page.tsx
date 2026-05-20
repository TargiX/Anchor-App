"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RitualShell } from "@/components/ritual-shell"
import { StepAffirmation } from "@/components/morning/step-affirmation"
import { StepSleep } from "@/components/morning/step-sleep"
import { StepMood } from "@/components/morning/step-mood"
import { StepIntention } from "@/components/morning/step-intention"
import { StepMeditation } from "@/components/morning/step-meditation"

const TOTAL_STEPS = 5

export default function MorningRitual() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  function next() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
    else router.push("/")
  }

  function back() {
    if (step > 0) setStep((s) => s - 1)
    else router.push("/")
  }

  return (
    <RitualShell step={step} totalSteps={TOTAL_STEPS}>
      {step === 0 && <StepAffirmation onNext={next} />}
      {step === 1 && <StepSleep onNext={next} onBack={back} />}
      {step === 2 && <StepMood onNext={next} onBack={back} isMorning />}
      {step === 3 && <StepIntention onNext={next} onBack={back} />}
      {step === 4 && <StepMeditation onNext={next} onBack={back} />}
    </RitualShell>
  )
}

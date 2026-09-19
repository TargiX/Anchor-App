import { AppScreenShell } from "@/components/app-screen-shell"
import { PulseCheck } from "@/components/pulse/pulse-check"

export default function PulsePage() {
  return (
    <AppScreenShell
      title="Check-in"
      description="How the day is landing."
      backHref="/app"
      railTitle="One pause."
      railBody="Notice where you are, then choose one next step."
    >
      <PulseCheck />
    </AppScreenShell>
  )
}

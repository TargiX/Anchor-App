import { AppScreenShell } from "@/components/app-screen-shell"
import { PulseCheck } from "@/components/pulse/pulse-check"

export default function PulsePage() {
  return (
    <AppScreenShell
      title="Midday pulse"
      eyebrow="A small return"
      description="A short pause to notice how the day is landing."
      backHref="/app"
      railTitle="Come back to the day you meant to have."
      railBody="This is not another task. It is a small moment to notice whether you are still with yourself."
    >
      <PulseCheck />
    </AppScreenShell>
  )
}

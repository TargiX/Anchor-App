import { AppScreenShell } from "@/components/app-screen-shell"
import { BoxBreathing } from "@/components/focus/box-breathing"

export default function FocusPage() {
  return (
    <AppScreenShell
      title="Focus"
      eyebrow="Breathe"
      description="A short box-breathing cycle to make room between the noise and your next move."
      backHref="/app"
      railTitle="Return to the moment."
      railBody="Four steady counts in each direction. Nothing to save, nothing to get right."
    >
      <BoxBreathing />
    </AppScreenShell>
  )
}

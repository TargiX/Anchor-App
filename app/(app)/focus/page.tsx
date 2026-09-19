import { AppScreenShell } from "@/components/app-screen-shell"
import { BoxBreathing } from "@/components/focus/box-breathing"

export default function FocusPage() {
  return (
    <AppScreenShell
      title="Breathe."
      description="Four counts. Nothing to save."
      backHref="/app"
      railTitle="Breathe."
      railBody="Four counts each side. Nothing to save."
    >
      <BoxBreathing />
    </AppScreenShell>
  )
}

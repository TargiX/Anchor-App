"use client"

import { CalendarDays } from "lucide-react"
import { AppScreenShell } from "@/components/app-screen-shell"
import { TimelineView } from "@/components/timeline-view"

export default function TimelinePage() {
  return (
    <AppScreenShell
      title="Timeline"
      eyebrow="Ritual history"
      description="A wider look at mood, sleep, habits, intention, and reflection over time."
      backHref="/app"
      railTitle="Your days, gathered."
      railBody="The timeline is meant for scanning patterns, not judging streaks. Open a day when you want the detail."
      railMeta={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 text-accent" />
          Local history
        </div>
      }
      contentClassName="lg:max-w-4xl"
    >
      <TimelineView />
    </AppScreenShell>
  )
}

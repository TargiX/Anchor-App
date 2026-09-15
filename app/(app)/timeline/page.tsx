"use client"

import { CalendarDays } from "lucide-react"
import { AppScreenShell } from "@/components/app-screen-shell"
import { RitualHistoryExport } from "@/components/ritual-history-export"
import { TimelineView } from "@/components/timeline-view"

export default function TimelinePage() {
  return (
    <AppScreenShell
      title="Journal"
      eyebrow="Your own words"
      description="Find a thought, revisit a moment, or see how a day unfolded."
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
      <RitualHistoryExport />
    </AppScreenShell>
  )
}

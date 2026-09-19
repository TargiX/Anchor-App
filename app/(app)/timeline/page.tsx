"use client"

import { CalendarDays } from "lucide-react"
import { AppScreenShell } from "@/components/app-screen-shell"
import { RitualHistoryExport } from "@/components/ritual-history-export"
import { TimelineView } from "@/components/timeline-view"

export default function TimelinePage() {
  return (
    <AppScreenShell
      title="Journal"
      description="Find a thought or open a day."
      railTitle="Your days, gathered."
      railBody="Scan the days. Open one when you want the detail."
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

"use client"

import { AppScreenShell, RailStat } from "@/components/app-screen-shell"
import { RitualHistoryExport } from "@/components/ritual-history-export"
import { TimelineView } from "@/components/timeline-view"
import { useAppState } from "@/hooks/use-store"

export default function TimelinePage() {
  const state = useAppState()
  const dayCount = Object.keys(state.entries).length
  const noteCount = Object.values(state.entries).reduce(
    (sum, entry) =>
      sum +
      (entry.quickCheckIns?.length ?? 0) +
      (entry.journal ? 1 : 0),
    0
  )
  return (
    <AppScreenShell
      title="Journal"
      description="Find a thought or open a day."
      railTitle="Your days, gathered."
      railBody="Scan the days. Open one when you want the detail."
      railMeta={
        dayCount > 0 ? (
          <div className="flex gap-8">
            <RailStat value={dayCount} label={dayCount === 1 ? "day" : "days"} />
            <RailStat value={noteCount} label={noteCount === 1 ? "note" : "notes"} />
          </div>
        ) : undefined
      }
      contentClassName="lg:max-w-4xl"
    >
      <TimelineView />
      <RitualHistoryExport />
    </AppScreenShell>
  )
}

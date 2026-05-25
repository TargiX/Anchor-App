"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { TimelineView } from "@/components/timeline-view"
import { Button } from "@/components/ui/button"

export default function TimelinePage() {
  const router = useRouter()
  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto px-6">
      <div className="flex items-center gap-3 pt-8 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-xl -ml-2">
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-medium text-foreground">
          Timeline
        </h1>
      </div>
      <TimelineView />
    </div>
  )
}

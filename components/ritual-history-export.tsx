"use client"

import { useState, useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"
import { Copy, Download, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/hooks/use-store"
import { createRitualHistoryExport } from "@/lib/domain/ritual-history-export"
import { getTodayKey } from "@/lib/time/today"

const subscribeToNativePlatform = () => () => undefined

export function RitualHistoryExport() {
  const { entries, habits } = useAppState()
  const [exportedArtifact, setExportedArtifact] = useState<string | null>(null)
  const [exportMethod, setExportMethod] = useState<"copy" | "download" | null>(
    null
  )
  const [exportError, setExportError] = useState<string | null>(null)
  const isNativePlatform = useSyncExternalStore(
    subscribeToNativePlatform,
    Capacitor.isNativePlatform,
    () => false
  )
  const artifact = createRitualHistoryExport({
    entries,
    habits,
    exportedOn: getTodayKey(),
  })
  const artifactKey = artifact
    ? `${artifact.filename}:${artifact.markdown}`
    : null
  const isCurrentArtifactExported =
    artifactKey !== null && exportedArtifact === artifactKey

  async function exportMarkdown() {
    if (!artifact || !artifactKey) return

    setExportError(null)

    if (isNativePlatform) {
      if (typeof navigator.clipboard?.writeText !== "function") {
        setExportError(
          "Could not access the clipboard. Your history stayed private."
        )
        return
      }

      try {
        await navigator.clipboard.writeText(artifact.markdown)
        setExportedArtifact(artifactKey)
        setExportMethod("copy")
      } catch {
        setExportError(
          "Could not copy the Markdown. Your history stayed private."
        )
      }
      return
    }

    const blob = new Blob([artifact.markdown], {
      type: "text/markdown;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = artifact.filename
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setExportedArtifact(artifactKey)
    setExportMethod("download")
  }

  return (
    <section
      aria-labelledby="ritual-history-export-title"
      className="mb-6 rounded-2xl border border-border bg-card/60 p-4 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:p-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 shrink-0 text-accent" />
          <h2
            id="ritual-history-export-title"
            className="text-sm font-medium text-foreground"
          >
            Take your history with you
          </h2>
        </div>
        <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground lg:text-sm lg:leading-6">
          {isNativePlatform
            ? "Copy your recorded ritual fields and current habit names as Markdown, then paste them into a file or notes app. Nothing is uploaded."
            : "Download your recorded ritual fields and current habit names as Markdown. The file is created on this device; nothing is uploaded."}
        </p>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-2 min-h-5 text-xs text-muted-foreground"
        >
          {exportError
            ? exportError
            : !artifact
              ? "No recorded ritual entries to export yet."
              : isCurrentArtifactExported
                ? `${exportMethod === "copy" ? "Copied" : "Downloaded"} ${artifact.entryCount} ${artifact.entryCount === 1 ? "entry" : "entries"} as Markdown.${exportMethod === "copy" ? " Paste it into a file or notes app." : ""}`
                : `${artifact.entryCount} ${artifact.entryCount === 1 ? "entry" : "entries"} ready to ${isNativePlatform ? "copy" : "download"}.`}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 w-full shrink-0 rounded-xl px-4 lg:mt-0 lg:w-auto"
        disabled={!artifact}
        onClick={() => void exportMarkdown()}
      >
        {isNativePlatform ? (
          <Copy className="size-4" data-icon="inline-start" />
        ) : (
          <Download className="size-4" data-icon="inline-start" />
        )}
        {artifact
          ? isNativePlatform
            ? "Copy Markdown"
            : "Download Markdown"
          : "Nothing to export"}
      </Button>
    </section>
  )
}

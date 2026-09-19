"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"
import { Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/hooks/use-store"
import { createRitualHistoryExport } from "@/lib/domain/ritual-history-export"
import { getTodayKey } from "@/lib/time/today"
import { captureClientException, captureEvent } from "@/lib/analytics/client"

const subscribeToNativePlatform = () => () => undefined

export function RitualHistoryExport() {
  const { entries, habits } = useAppState()
  const [exportedArtifact, setExportedArtifact] = useState<string | null>(null)
  const [exportMethod, setExportMethod] = useState<"copy" | "download" | null>(
    null
  )
  const [exportError, setExportError] = useState<string | null>(null)
  const activeExportAttemptRef = useRef<symbol | null>(null)
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

    if (isNativePlatform && activeExportAttemptRef.current) return

    setExportError(null)

    if (isNativePlatform) {
      if (typeof navigator.clipboard?.writeText !== "function") {
        captureEvent("ritual_history_export_failed", {
          method: "copy",
          reason: "clipboard_unavailable",
        })
        setExportError(
          "Could not access the clipboard. Your history stayed private."
        )
        return
      }

      const attempt = Symbol("ritual-history-export")
      activeExportAttemptRef.current = attempt

      try {
        await navigator.clipboard.writeText(artifact.markdown)
        if (activeExportAttemptRef.current === attempt) {
          setExportedArtifact(artifactKey)
          setExportMethod("copy")
          captureEvent("ritual_history_exported", {
            method: "copy",
            entry_count: artifact.entryCount,
          })
        }
      } catch (error) {
        captureClientException(error, {
          flow: "ritual_history_export",
          method: "copy",
        })
        if (activeExportAttemptRef.current === attempt) {
          setExportError(
            "Could not copy the Markdown. Your history stayed private."
          )
        }
      } finally {
        if (activeExportAttemptRef.current === attempt) {
          activeExportAttemptRef.current = null
        }
      }
      return
    }

    let url: string | null = null
    let link: HTMLAnchorElement | null = null

    try {
      const blob = new Blob([artifact.markdown], {
        type: "text/markdown;charset=utf-8",
      })
      url = URL.createObjectURL(blob)
      link = document.createElement("a")
      link.href = url
      link.download = artifact.filename
      document.body.append(link)
      link.click()
      setExportedArtifact(artifactKey)
      setExportMethod("download")
      captureEvent("ritual_history_exported", {
        method: "download",
        entry_count: artifact.entryCount,
      })
    } catch (error) {
      captureClientException(error, {
        flow: "ritual_history_export",
        method: "download",
      })
      setExportError(
        "Could not start the Markdown download. Your history stayed private."
      )
    } finally {
      link?.remove()
      const urlToRevoke = url
      if (urlToRevoke) {
        window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0)
      }
    }
  }

  if (!artifact) {
    return (
      <p role="status" aria-live="polite" className="sr-only">
        Nothing to export yet.
      </p>
    )
  }

  return (
    <section
      aria-labelledby="ritual-history-export-title"
      className="mt-10 border-t border-border pt-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2
            id="ritual-history-export-title"
            className="text-sm font-medium text-foreground"
          >
            Export Markdown
          </h2>
          {!exportError && !isCurrentArtifactExported ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {isNativePlatform
                ? "Copy recorded fields to paste into a notes app. Nothing is uploaded."
                : "A file on this device. Nothing is uploaded."}
            </p>
          ) : null}
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={
              exportError || isCurrentArtifactExported
                ? "mt-1 text-xs text-muted-foreground"
                : "sr-only"
            }
          >
            {exportError
              ? exportError
              : isCurrentArtifactExported
                ? `${exportMethod === "copy" ? "Copied" : "Download requested for"} ${artifact.entryCount} ${artifact.entryCount === 1 ? "entry" : "entries"} as Markdown.${exportMethod === "copy" ? " Paste it into a file or notes app." : ""}`
                : `${artifact.entryCount} ${artifact.entryCount === 1 ? "entry" : "entries"} ready to ${isNativePlatform ? "copy" : "download"}.`}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 self-start rounded-xl px-4"
          onClick={() => void exportMarkdown()}
        >
          {isNativePlatform ? (
            <Copy className="size-4" data-icon="inline-start" />
          ) : (
            <Download className="size-4" data-icon="inline-start" />
          )}
          {isNativePlatform ? "Copy Markdown" : "Download Markdown"}
        </Button>
      </div>
    </section>
  )
}

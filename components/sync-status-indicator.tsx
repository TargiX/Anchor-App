"use client"

import { useSyncExternalStore } from "react"
import { Check, CloudOff, LoaderCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { cloudSyncStatus } from "@/lib/store/sync-status"
import { cn } from "@/lib/utils"

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { status: authStatus } = useAuth()
  const sync = useSyncExternalStore(
    cloudSyncStatus.subscribe,
    cloudSyncStatus.getSnapshot,
    cloudSyncStatus.getServerSnapshot
  )

  if (authStatus !== "authed" || sync.phase === "inactive") return null

  const isError = sync.phase === "error"
  const isBusy = sync.phase === "initial-sync" || sync.phase === "saving"
  const label =
    sync.phase === "initial-sync"
      ? "Syncing from cloud…"
      : sync.phase === "saving"
        ? "Saving to cloud…"
        : sync.phase === "saved"
          ? "Saved to cloud"
          : "Cloud save failed — edit to retry"

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isError ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {isBusy ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : isError ? (
        <CloudOff className="size-3.5" aria-hidden="true" />
      ) : (
        <Check className="size-3.5" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  )
}

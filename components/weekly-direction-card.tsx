"use client"

import { useState } from "react"
import { useAppState } from "@/hooks/use-store"
import { isOpenWeeklyDirection } from "@/lib/domain/weekly-direction"
import { LIMITS } from "@/lib/domain/validation"
import {
  changeWeeklyDirection,
  finishWeeklyDirection,
  releaseWeeklyDirection,
} from "@/lib/store/actions"
import { flushDeviceStorage, getStorageIdentity } from "@/lib/store/store"

export function WeeklyDirectionCard() {
  const { weeklyDirection } = useAppState()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(weeklyDirection?.text ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  if (!isOpenWeeklyDirection(weeklyDirection)) return null

  async function persist(act: () => boolean) {
    if (busy) return
    setBusy(true)
    setError("")
    const identity = getStorageIdentity()
    const saved = act()
    const durable = saved && (await flushDeviceStorage())
    setBusy(false)
    if (identity !== getStorageIdentity()) return
    if (!saved || !durable) {
      setError(
        saved
          ? "This choice is not saved yet. Keep this screen open and retry."
          : "This step is no longer open. Open Review to choose another."
      )
      return
    }
    setEditing(false)
  }

  return (
    <section aria-label="Something to carry forward" className="mt-8">
      <p className="text-xs font-medium text-muted-foreground">
        This week&apos;s step
      </p>
      {editing ? (
        <label className="mt-2 block text-sm">
          Change this step
          <input
            aria-label="Change this week's step"
            value={draft}
            disabled={busy}
            maxLength={LIMITS.intentionMax}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-2 min-h-12 w-full border-0 border-b border-border bg-transparent p-0 text-base outline-none focus-visible:border-foreground focus-visible:ring-0"
          />
        </label>
      ) : (
        <p className="mt-1 font-[family-name:var(--font-display)] text-lg leading-snug [overflow-wrap:anywhere]">
          {weeklyDirection.text}
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-4">
        {editing ? (
          <>
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void persist(() => changeWeeklyDirection(draft))}
              className="inline-flex min-h-11 items-center text-sm text-primary disabled:opacity-40"
            >
              Save step
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(weeklyDirection.text)
                setEditing(false)
                setError("")
              }}
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(finishWeeklyDirection)}
              className="inline-flex min-h-11 items-center text-sm text-primary disabled:opacity-40"
            >
              Finished it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(weeklyDirection.text)
                setEditing(true)
                setError("")
              }}
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground disabled:opacity-40"
            >
              Change
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(releaseWeeklyDirection)}
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground disabled:opacity-40"
            >
              Let it go
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

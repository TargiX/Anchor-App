"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, RotateCcw, Route } from "lucide-react"
import { useTodayEntry } from "@/hooks/use-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store/actions"
import { type MiddayCheckIn } from "@/lib/domain/entry"
import { saveFocusResetContextFrom } from "@/lib/focus/reset-context"

const CHECK_INS: Array<{
  value: MiddayCheckIn
  title: string
  description: string
  icon: typeof Check
}> = [
  {
    value: "on-track",
    title: "I am still with it",
    description: "Keep moving with the direction you chose this morning.",
    icon: Check,
  },
  {
    value: "reset",
    title: "I need a reset",
    description: "Take one breath, make the next action smaller, and begin again.",
    icon: RotateCcw,
  },
  {
    value: "pivot",
    title: "Today needs a pivot",
    description: "The day changed. Choose a direction that fits the day you actually have.",
    icon: Route,
  },
]

export function PulseCheck() {
  const router = useRouter()
  const today = useTodayEntry()
  const [selected, setSelected] = useState<MiddayCheckIn | null>(
    today.middayCheckIn ?? null
  )
  const [returnedFromFocus, setReturnedFromFocus] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- sync hydrated entry from external store */
  useEffect(() => {
    setSelected(today.middayCheckIn ?? null)
  }, [today.middayCheckIn])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- read the one-shot Focus return marker after hydration */
  useEffect(() => {
    setReturnedFromFocus(new URLSearchParams(window.location.search).get("after") === "focus")
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function saveCheckIn() {
    if (!selected) return
    updateTodayEntry({ middayCheckIn: selected })

    const nextStep = today.intention?.trim()
    if (selected === "reset" && nextStep) {
      saveFocusResetContextFrom(() => window.sessionStorage, nextStep)
    }

    router.push(selected === "reset" ? "/focus" : "/app")
  }

  const isReset = selected === "reset"

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 lg:pb-12">
      <div className="pt-3">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Right now
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground text-balance lg:text-4xl">
          How is the day landing?
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Choose the response that gives you the most honest next step. You can revise it later.
        </p>
      </div>

      {returnedFromFocus ? (
        <div
          role="status"
          className="rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4"
        >
          <p className="text-sm font-medium text-foreground">You made some room.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Notice what feels true now, then choose the response that fits this moment.
          </p>
        </div>
      ) : null}

      {today.intention ? (
        <div className="rounded-2xl border border-border bg-card/60 px-5 py-4">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            This morning you chose
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg leading-relaxed text-foreground italic">
            &ldquo;{today.intention}&rdquo;
          </p>
        </div>
      ) : null}

      <div role="radiogroup" aria-label="Midday check-in" className="grid gap-3">
        {CHECK_INS.map(({ value, title, description, icon: Icon }) => {
          const isSelected = selected === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(value)}
              className={cn(
                "flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/8"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-base font-medium text-foreground">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {isReset ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-primary/30 bg-primary/6 px-5 py-4"
        >
          <p className="text-sm font-medium text-foreground">Make a little room first.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            We&apos;ll save this check-in, then begin a short box-breathing cycle before you return to the day.
          </p>
        </div>
      ) : null}

      <Button
        className="mt-auto h-14 w-full rounded-2xl text-base font-medium"
        disabled={!selected}
        onClick={saveCheckIn}
      >
        {isReset ? "Save and begin a breathing reset" : "Save this check-in"}
      </Button>
    </div>
  )
}

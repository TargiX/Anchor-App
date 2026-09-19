"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTodayEntry } from "@/hooks/use-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store/actions"
import { type MiddayCheckIn } from "@/lib/domain/entry"
import { saveFocusResetContextFrom } from "@/lib/focus/reset-context"
import { captureEvent } from "@/lib/analytics/client"
import { readFocusReturnFrom } from "@/lib/focus/focus-return"

const CHECK_INS: Array<{
  value: MiddayCheckIn
  title: string
  description: string
}> = [
  {
    value: "on-track",
    title: "I am still with it",
    description: "Keep the direction you chose this morning.",
  },
  {
    value: "reset",
    title: "I need a reset",
    description: "Make the next action smaller, then begin again.",
  },
  {
    value: "pivot",
    title: "Today needs a pivot",
    description: "Choose a direction that fits the day you actually have.",
  },
]

/**
 * Pulse midday check-in: lets the user report how the day is going and, on
 * "reset", persist the next step and hand off to Focus. Highlights the
 * post-reset check-in on the arrival that directly follows a Focus reset.
 */
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
    setReturnedFromFocus(readFocusReturnFrom(() => window.location.search))
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function saveCheckIn() {
    if (!selected) return
    updateTodayEntry({ middayCheckIn: selected })

    const nextStep = today.intention?.trim()
    if (selected === "reset" && nextStep) {
      saveFocusResetContextFrom(() => window.sessionStorage, nextStep)
    }

    captureEvent("pulse_check_in_saved", {
      follows_focus_reset: returnedFromFocus,
      has_morning_intention: Boolean(nextStep),
    })

    router.push(selected === "reset" ? "/focus" : "/app")
  }

  const isReset = selected === "reset"

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 lg:pb-12">
      <div className="pt-3">
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
          How is the day landing?
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          One choice is enough.
        </p>
      </div>

      {returnedFromFocus ? (
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          You made some room. Choose what fits this moment.
        </p>
      ) : null}

      {today.intention ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            This morning you chose
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg leading-relaxed text-foreground italic">
            &ldquo;{today.intention}&rdquo;
          </p>
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Midday check-in"
        className="grid gap-1"
      >
        {CHECK_INS.map(({ value, title, description }) => {
          const isSelected = selected === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(value)}
              className={cn(
                "w-full border-l-2 py-4 pl-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring",
                isSelected ? "border-foreground" : "border-transparent"
              )}
            >
              <span
                className={cn(
                  "block text-base",
                  isSelected
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {title}
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            </button>
          )
        })}
      </div>

      {isReset ? (
        <p
          aria-live="polite"
          className="text-sm leading-6 text-muted-foreground"
        >
          A little breathing first, then back to the day.
        </p>
      ) : null}

      <Button
        className="mt-auto h-14 w-full rounded-2xl text-base font-medium"
        disabled={!selected}
        onClick={saveCheckIn}
      >
        {isReset ? "Save and breathe" : "Save this check-in"}
      </Button>
    </div>
  )
}

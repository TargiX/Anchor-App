"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateEntry } from "@/lib/store/actions"
import { useAppState, useEntry } from "@/hooks/use-store"
import { Check } from "lucide-react"

interface StepHabitsProps {
  entryKey: string
  onNext: () => void
  onBack: () => void
}

export function StepHabits({ entryKey, onNext, onBack }: StepHabitsProps) {
  const state = useAppState()
  const entry = useEntry(entryKey)
  const [checked, setChecked] = useState<string[]>([])

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    setChecked(entry.habitsCompleted ?? [])
  }, [entryKey, entry.habitsCompleted])
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggle(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function handleNext() {
    updateEntry(entryKey, { habitsCompleted: checked })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Habits</p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
          How did your habits land today?
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {state.habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No habits yet. Add them in Settings when you want.
          </p>
        ) : (
          state.habits.map((habit) => {
            const done = checked.includes(habit.id)
            return (
              <button
                key={habit.id}
                onClick={() => toggle(habit.id)}
                aria-pressed={done}
                className="flex min-h-12 items-center gap-3 py-2 text-left"
              >
                <div
                  className={cn(
                    "flex size-5 flex-none items-center justify-center rounded-full border-2 transition-colors",
                    done ? "border-accent bg-accent" : "border-border"
                  )}
                >
                  {done && (
                    <Check
                      className="size-3 text-accent-foreground"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {habit.name}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Nav */}
      <div className="mt-auto flex gap-3 pb-10">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-14 flex-none rounded-2xl px-6"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

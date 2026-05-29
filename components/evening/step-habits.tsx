"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { useAppState } from "@/hooks/use-store"
import { getTodayKey } from "@/lib/time/today"
import { Check } from "lucide-react"

interface StepHabitsProps {
  onNext: () => void
  onBack: () => void
}

export function StepHabits({ onNext, onBack }: StepHabitsProps) {
  const state = useAppState()
  const today = state.entries[getTodayKey()]
  const [checked, setChecked] = useState<string[]>(today?.habitsCompleted ?? [])

  function toggle(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function handleNext() {
    updateTodayEntry({ habitsCompleted: checked })
    onNext()
  }

  const allDone = checked.length === state.habits.length

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Habits
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
          How did your habits land today?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No judgment here. Just an honest look.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {state.habits.map((habit) => {
          const done = checked.includes(habit.id)
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => toggle(habit.id)}
              aria-pressed={done}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                done
                  ? "border-accent/50 bg-accent/8"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "flex size-5 flex-none items-center justify-center rounded-full border-2 transition-all",
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
        })}
      </div>

      {allDone && (
        <p className="text-center font-[family-name:var(--font-display)] text-sm text-muted-foreground italic">
          That&apos;s a full day. Well done.
        </p>
      )}

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

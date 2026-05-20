"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { useAppState } from "@/hooks/use-store"
import { Check } from "lucide-react"

interface StepHabitsProps {
  onNext: () => void
  onBack: () => void
}

export function StepHabits({ onNext, onBack }: StepHabitsProps) {
  const state = useAppState()
  const [checked, setChecked] = useState<string[]>([])

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
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Habits
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          How did your habits land today?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No judgment here. Just an honest look.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {state.habits.map((habit) => {
          const done = checked.includes(habit.id)
          return (
            <button
              key={habit.id}
              onClick={() => toggle(habit.id)}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200",
                done
                  ? "border-accent/50 bg-accent/8"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "size-5 rounded-full border-2 flex items-center justify-center flex-none transition-all",
                  done ? "border-accent bg-accent" : "border-border"
                )}
              >
                {done && <Check className="size-3 text-accent-foreground" strokeWidth={3} />}
              </div>
              <span className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>
                {habit.name}
              </span>
            </button>
          )
        })}
      </div>

      {allDone && (
        <p className="text-sm text-center text-muted-foreground font-[family-name:var(--font-display)] italic">
          That&apos;s a full day. Well done.
        </p>
      )}

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

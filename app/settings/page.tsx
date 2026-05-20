"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAppState, setState } from "@/hooks/use-store"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const router = useRouter()
  const state = useAppState()
  const { theme, setTheme } = useTheme()
  const [newHabit, setNewHabit] = useState("")

  function addHabit() {
    if (!newHabit.trim()) return
    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, { id: String(Date.now()), name: newHabit.trim(), icon: "circle" }],
    }))
    setNewHabit("")
  }

  function removeHabit(id: string) {
    setState((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }))
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto px-6 pb-8">
      <div className="flex items-center gap-3 pt-8 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-xl -ml-2">
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-medium text-foreground">
          Settings
        </h1>
      </div>

      <Tabs defaultValue="habits" className="flex-1">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="habits">Habits</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="habits" className="flex flex-col gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Your habits</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {state.habits.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border">
                  <span className="text-sm text-foreground">{habit.name}</span>
                  <button
                    onClick={() => removeHabit(habit.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <input
              type="text"
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              placeholder="Add a new habit..."
              className={cn(
                "flex-1 px-4 py-3 rounded-xl border border-border bg-card",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            />
            <Button onClick={addHabit} className="rounded-xl px-4" disabled={!newHabit.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="flex flex-col gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Ritual reminders</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground font-medium">Morning ritual</label>
                <input
                  type="time"
                  value={state.notificationMorning}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, notificationMorning: e.target.value }))
                  }
                  className={cn(
                    "px-4 py-3 rounded-xl border border-border bg-card",
                    "text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground font-medium">Evening ritual</label>
                <input
                  type="time"
                  value={state.notificationEvening}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, notificationEvening: e.target.value }))
                  }
                  className={cn(
                    "px-4 py-3 rounded-xl border border-border bg-card",
                    "text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="flex flex-col gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {["light", "dark", "sepia"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm text-left capitalize transition-all",
                    theme === t
                      ? "border-accent bg-accent/10 text-foreground font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {t}
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

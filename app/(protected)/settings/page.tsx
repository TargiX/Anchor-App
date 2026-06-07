"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { HabitIcon } from "@/components/habit-icon"
import { useAuth } from "@/components/auth-provider"
import { useAppState } from "@/hooks/use-store"
import { addHabit, removeHabit, setNotificationTime } from "@/lib/store/actions"
import { LIMITS } from "@/lib/domain/validation"
import {
  useNotificationPermission,
  requestPermission,
  notify,
  usesNativeScheduler,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

const THEMES = ["light", "dark", "sepia"] as const

export default function SettingsPage() {
  const router = useRouter()
  const state = useAppState()
  const { status, user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [newHabit, setNewHabit] = useState("")
  const [habitError, setHabitError] = useState<string | null>(null)
  const permission = useNotificationPermission()
  const nativeReminders = usesNativeScheduler()

  function handleAddHabit() {
    const result = addHabit(newHabit)
    if (!result.ok) {
      setHabitError(result.error)
      return
    }
    setNewHabit("")
    setHabitError(null)
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto px-6 pb-8">
      <div className="flex items-center gap-3 pt-8 pb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/app")} className="rounded-xl -ml-2">
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
              {state.habits.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  No habits yet. Add your first one below.
                </div>
              ) : (
                state.habits.map((habit) => (
                  <div key={habit.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border">
                    <span className="flex items-center gap-3 text-sm text-foreground">
                      <HabitIcon icon={habit.icon} className="size-4 text-muted-foreground" />
                      {habit.name}
                    </span>
                    <button
                      onClick={() => removeHabit(habit.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${habit.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabit}
                onChange={(e) => {
                  setNewHabit(e.target.value)
                  if (habitError) setHabitError(null)
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                placeholder="Add a new habit..."
                maxLength={LIMITS.habitNameMax}
                aria-invalid={habitError ? true : undefined}
                aria-describedby={habitError ? "habit-error" : undefined}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl border bg-card",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  habitError ? "border-destructive" : "border-border"
                )}
              />
              <Button onClick={handleAddHabit} className="rounded-xl px-4" disabled={!newHabit.trim()}>
                <Plus className="size-4" />
              </Button>
            </div>
            {habitError && (
              <p id="habit-error" role="alert" className="px-1 text-xs text-destructive">
                {habitError}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="flex flex-col gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Ritual reminders</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Permission + honest platform note */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {permission === "granted"
                      ? "Reminders enabled"
                      : permission === "denied"
                        ? "Reminders blocked"
                        : permission === "unsupported"
                          ? "Not supported here"
                          : "Reminders are off"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {permission === "denied"
                      ? "Re-enable notifications in your browser settings."
                      : permission === "unsupported"
                        ? "This browser can't show notifications."
                        : nativeReminders
                          ? "Scheduled by iOS."
                          : "Fire while Anchor is open."}
                  </span>
                </div>
                {permission === "granted" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => notify("Test reminder", { body: "Reminders are working." })}
                  >
                    Send test
                  </Button>
                ) : permission === "default" ? (
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void requestPermission()}
                  >
                    Enable
                  </Button>
                ) : null}
              </div>

              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {nativeReminders
                  ? "On iOS, Anchor schedules OS-level daily reminders so they keep working when the app is closed."
                  : "On the web, reminders only fire while Anchor is open. Install the iOS app for reliable background reminders."}
              </p>

              <Separator />

              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground font-medium">Morning ritual</label>
                <input
                  type="time"
                  value={state.notificationMorning}
                  onChange={(e) => setNotificationTime("morning", e.target.value)}
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
                  onChange={(e) => setNotificationTime("evening", e.target.value)}
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
              {THEMES.map((t) => (
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

      {status === "authed" && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</span>
            <span className="truncate text-sm font-medium text-foreground">{user?.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => signOut()}
          >
            <LogOut className="size-4" data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  )
}

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
import { addHabit, removeHabit, setNotificationTime } from "@/lib/store"
import { LIMITS } from "@/lib/domain/validation"
import {
  getNotificationMode,
  isNativeNotificationScheduler,
  useNotificationPermission,
  requestPermission,
  notify,
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
  const notificationMode = getNotificationMode()
  const hasNativeReminders = isNativeNotificationScheduler()

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-8">
      <div className="flex items-center gap-3 pt-8 pb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/app")}
          className="-ml-2 rounded-xl"
        >
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

        <TabsContent value="habits" className="mt-6 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Your habits
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {state.habits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-sm text-foreground">
                    <HabitIcon
                      icon={habit.icon}
                      className="size-4 text-muted-foreground"
                    />
                    {habit.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeHabit(habit.id)}
                    className="rounded-lg text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                    aria-label={`Remove ${habit.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
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
                  "flex-1 rounded-xl border bg-card px-4 py-3",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:outline-none",
                  habitError ? "border-destructive" : "border-border"
                )}
              />
              <Button
                type="button"
                onClick={handleAddHabit}
                className="rounded-xl px-4"
                disabled={!newHabit.trim()}
                aria-label="Add habit"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {habitError && (
              <p
                id="habit-error"
                role="alert"
                className="px-1 text-xs text-destructive"
              >
                {habitError}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Ritual reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Permission + honest platform note */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {hasNativeReminders && permission === "granted"
                      ? "Native reminders enabled"
                      : permission === "granted"
                        ? "Reminders enabled"
                        : permission === "denied"
                          ? "Reminders blocked"
                          : permission === "unsupported"
                            ? "Not supported here"
                            : "Reminders are off"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {permission === "denied"
                      ? hasNativeReminders
                        ? "Enable notifications in iOS Settings."
                        : "Re-enable notifications in your browser settings."
                      : permission === "unsupported"
                        ? "This browser can't show notifications."
                        : hasNativeReminders
                          ? "Scheduled by iOS at your ritual times."
                          : "Fire while Anchor is open."}
                  </span>
                </div>
                {permission === "granted" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      notify("Test reminder", {
                        body: "Reminders are working.",
                      })
                    }
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
                {notificationMode === "native"
                  ? "In the iOS app, Anchor schedules local reminders on this device. They do not require an account or server."
                  : "On the web, reminders only fire while Anchor is open. Install the app for reliable device reminders."}
              </p>

              <Separator />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Morning ritual
                </label>
                <input
                  type="time"
                  value={state.notificationMorning}
                  onChange={(e) =>
                    setNotificationTime("morning", e.target.value)
                  }
                  className={cn(
                    "rounded-xl border border-border bg-card px-4 py-3",
                    "text-sm text-foreground",
                    "focus:ring-2 focus:ring-ring focus:outline-none"
                  )}
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Evening ritual
                </label>
                <input
                  type="time"
                  value={state.notificationEvening}
                  onChange={(e) =>
                    setNotificationTime("evening", e.target.value)
                  }
                  className={cn(
                    "rounded-xl border border-border bg-card px-4 py-3",
                    "text-sm text-foreground",
                    "focus:ring-2 focus:ring-ring focus:outline-none"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-6 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm capitalize transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    theme === t
                      ? "border-accent bg-accent/10 font-medium text-foreground"
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
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Signed in as
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {user?.email}
            </span>
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

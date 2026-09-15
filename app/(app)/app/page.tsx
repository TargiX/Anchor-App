"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Anchor, BookOpen, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { Button } from "@/components/ui/button"
import { useTodayEntry } from "@/hooks/use-store"
import { saveQuickCheckIn } from "@/lib/store/actions"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

export default function Home() {
  const { status, user } = useAuth()
  // Remount the input on identity changes so private drafts never cross accounts.
  return (
    <Today
      key={`${status}:${user?.id ?? "guest"}`}
      ready={status !== "loading"}
      signedIn={status === "authed"}
    />
  )
}

function Today({ ready, signedIn }: { ready: boolean; signedIn: boolean }) {
  const today = useTodayEntry()
  const [note, setNote] = useState("")
  const [nextStep, setNextStep] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!ready) return
    const result = saveQuickCheckIn(
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        note,
        nextStep,
      },
      getTodayKey()
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNote("")
    setNextStep("")
    setMessage("Saved on this device. You can leave it here.")
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between">
        <Link
          href="/app"
          className="flex min-h-11 items-center gap-2 font-medium"
        >
          <Anchor className="size-5" />
          Anchor
        </Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link
            href="/timeline"
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm hover:bg-muted"
          >
            <BookOpen className="size-4" />
            History
          </Link>
          <Link
            href={signedIn ? "/settings" : "/login"}
            aria-label={signedIn ? "Settings" : "Sign in for sync"}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-muted"
          >
            <Settings className="size-5" />
          </Link>
        </nav>
      </header>

      <section className="pt-12 pb-8">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Right now
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          Continue from here.
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          A few words to clear your head. Nothing to catch up on.
        </p>
        {signedIn && (
          <div className="mt-3">
            <SyncStatusIndicator />
          </div>
        )}
      </section>

      {today.intention && (
        <section
          aria-label="Your current anchor"
          className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-5"
        >
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Your anchor today
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl [overflow-wrap:anywhere]">
            {today.intention}
          </p>
          <Link
            href="/focus"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
          >
            Take a moment to reset <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <form
        onSubmit={save}
        className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-7"
      >
        <div>
          <label htmlFor="checkin-note" className="block font-medium">
            What’s on your mind?
          </label>
          <p id="note-hint" className="mt-1 text-sm text-muted-foreground">
            Fragments are fine. Your words stay in your own words.
          </p>
          <textarea
            id="checkin-note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setMessage("")
            }}
            required
            maxLength={LIMITS.journalMax}
            rows={4}
            aria-describedby="note-hint"
            placeholder="A lot going on, not sure where to start…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-base leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="checkin-next" className="block font-medium">
            One small next step{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <input
            id="checkin-next"
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
            maxLength={LIMITS.intentionMax}
            placeholder="Open the document. Or take a break."
            className="mt-3 min-h-12 w-full rounded-xl border border-border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Add a step to update today’s anchor, or leave it empty to keep the
            current one.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={!ready || !note.trim()}
          className="min-h-12 w-full rounded-xl text-base"
        >
          Save check-in <ArrowRight className="size-4" />
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          {signedIn
            ? "Saved on this device first. Account sync status appears above."
            : "Saved on this device when you tap Save. Clearing browser data removes guest notes."}
        </p>
      </form>
      <p
        role="status"
        aria-live="polite"
        className="mt-4 min-h-6 text-sm text-primary"
      >
        {message}
      </p>

      {Boolean(today.quickCheckIns?.length) && (
        <section aria-label="Today's check-ins" className="mt-7">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            A little space for today
          </h2>
          <div className="mt-4 space-y-3">
            {today.quickCheckIns
              ?.slice()
              .reverse()
              .map((checkIn) => (
                <article
                  key={checkIn.id}
                  className="rounded-2xl border border-border p-4"
                >
                  <p className="text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {checkIn.note}
                  </p>
                  {checkIn.nextStep && (
                    <p className="mt-2 text-sm [overflow-wrap:anywhere] text-muted-foreground">
                      Next step: {checkIn.nextStep}
                    </p>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm text-muted-foreground">Want a longer moment?</h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/morning"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Morning ritual
          </Link>
          <Link
            href="/evening"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Evening reflection
          </Link>
          <Link
            href="/focus"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            A quiet reset
          </Link>
        </div>
      </section>
    </main>
  )
}

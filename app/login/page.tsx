"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { validateEmail, validatePassword } from "@/lib/auth/credentials"
import { cn } from "@/lib/utils"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const { status, signIn, signUp } = useAuth()

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    form?: string
  }>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in, or accounts disabled (local-only mode) → go to the app.
  // In local-only mode there's nothing to log into, so /login is a no-op page.
  useEffect(() => {
    if (status === "authed" || status === "unconfigured") router.replace("/app")
  }, [status, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    if (emailError || passwordError) {
      setErrors({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
      })
      return
    }
    setErrors({})
    setNotice(null)
    setSubmitting(true)

    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password)
      if (error) setErrors({ form: error })
      else router.replace("/app")
    } else {
      const { error, needsConfirmation } = await signUp(email.trim(), password)
      if (error) setErrors({ form: error })
      else if (needsConfirmation)
        setNotice("Check your email to confirm your account.")
      else router.replace("/app")
    }
    setSubmitting(false)
  }

  // While redirecting (authed / local-only), render nothing to avoid a flash.
  if (status === "authed" || status === "unconfigured") return null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AnchorMotif size={72} className="text-primary" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to sync your rituals across devices."
              : "Start syncing your rituals across devices."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <input
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              className={inputClass(!!errors.password)}
            />
          </Field>

          {errors.form && (
            <p role="alert" className="text-sm text-destructive">
              {errors.form}
            </p>
          )}
          {notice && <p className="text-sm text-accent-foreground">{notice}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-2xl text-base font-medium"
          >
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin")
              setErrors({})
              setNotice(null)
            }}
            className="rounded-sm font-medium text-foreground underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  )
}

function inputClass(invalid: boolean): string {
  return cn(
    "w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground",
    "placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none",
    invalid ? "border-destructive" : "border-border"
  )
}

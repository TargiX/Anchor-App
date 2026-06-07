"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { validateEmail, validatePassword } from "@/lib/auth/credentials"
import { cn } from "@/lib/utils"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const { status, signIn, signUp, resendConfirmation } = useAuth()

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    form?: string
  }>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null
  )
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  // Already signed in, or local dev has no Supabase env yet.
  useEffect(() => {
    if (status === "authed" || status === "unconfigured") router.replace("/app")
  }, [status, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim()
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

    try {
      if (mode === "signin") {
        const { error } = await signIn(normalizedEmail, password)
        if (error) {
          if (isUnconfirmedEmailError(error))
            setConfirmationEmail(normalizedEmail)
          setErrors({ form: authErrorMessage(error) })
        } else {
          router.replace("/app")
        }
      } else {
        const { error, needsConfirmation } = await signUp(
          normalizedEmail,
          password
        )
        if (error) setErrors({ form: error })
        else if (needsConfirmation) {
          setConfirmationEmail(normalizedEmail)
          setPassword("")
        } else {
          router.replace("/app")
        }
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendConfirmation(targetEmail: string) {
    const emailError = validateEmail(targetEmail)
    if (emailError) {
      setErrors({ email: emailError })
      return
    }

    setErrors({})
    setNotice(null)
    setResending(true)
    try {
      const { error } = await resendConfirmation(targetEmail.trim())
      if (error) setErrors({ form: error })
      else setNotice("Confirmation email sent again.")
    } catch {
      setErrors({ form: "Something went wrong. Please try again." })
    } finally {
      setResending(false)
    }
  }

  // While auth is resolving, keep the page non-interactive to avoid early submits.
  if (status === "loading") {
    return (
      <div
        className="flex min-h-dvh items-center justify-center px-6"
        aria-live="polite"
      >
        <div className="text-sm text-muted-foreground">
          Checking your session…
        </div>
      </div>
    )
  }

  // While redirecting, render nothing to avoid a flash.
  if (status === "authed" || status === "unconfigured") return null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AnchorMotif size={72} className="text-primary" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {confirmationEmail
              ? "Check your email"
              : mode === "signin"
                ? "Welcome back"
                : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {confirmationEmail
              ? "Confirm your account before signing in."
              : mode === "signin"
                ? "Sign in to sync your rituals across devices."
                : "Start syncing your rituals across devices."}
          </p>
        </div>

        {confirmationEmail ? (
          <ConfirmationPanel
            email={confirmationEmail}
            errors={errors.form}
            notice={notice}
            resending={resending}
            onResend={() => handleResendConfirmation(confirmationEmail)}
            onBackToSignIn={() => {
              setMode("signin")
              setErrors({})
              setNotice(null)
              setConfirmationEmail(null)
            }}
          />
        ) : (
          <>
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
              {notice && (
                <p className="text-sm text-accent-foreground">{notice}</p>
              )}

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
              {mode === "signin"
                ? "No account yet?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin")
                  setErrors({})
                  setNotice(null)
                }}
                className="font-medium text-foreground underline"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </>
        )}
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

function ConfirmationPanel({
  email,
  errors,
  notice,
  resending,
  onResend,
  onBackToSignIn,
}: {
  email: string
  errors?: string
  notice: string | null
  resending: boolean
  onResend: () => void
  onBackToSignIn: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
      <p className="text-sm leading-6 text-muted-foreground">
        We created your account. Confirm the email sent to{" "}
        <span className="font-medium text-foreground">{email}</span>, then come
        back to sign in.
      </p>

      {errors && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {errors}
        </p>
      )}
      {notice && (
        <p className="mt-4 text-sm text-accent-foreground">{notice}</p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <Button
          type="button"
          onClick={onBackToSignIn}
          className="h-12 rounded-2xl text-base font-medium"
        >
          I confirmed, sign in
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={resending}
          onClick={onResend}
          className="h-11 rounded-2xl"
        >
          {resending ? "Sending…" : "Resend email"}
        </Button>
      </div>
    </div>
  )
}

function isUnconfirmedEmailError(error: string): boolean {
  return /email not confirmed|not confirmed/i.test(error)
}

function authErrorMessage(error: string): string {
  if (isUnconfirmedEmailError(error)) {
    return "Your email is not confirmed yet. Check your inbox, then sign in again."
  }
  return error
}

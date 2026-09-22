"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { validatePassword } from "@/lib/auth/credentials"
import { cn } from "@/lib/utils"

// `useSearchParams()` must be inside a Suspense boundary for the page to
// prerender statically. The default export wraps the form accordingly.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPassword } = useAuth()

  const token = searchParams.get("token")
  const linkError = searchParams.get("error")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(
    linkError ? "This reset link is invalid or expired." : null
  )
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError("This reset link is invalid or expired.")
      return
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const { error: resetError } = await resetPassword(token, password)
      if (resetError) setError(resetError)
      else router.replace("/login?reset=1")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-app flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AnchorMotif size={72} className="text-primary" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Choose a new password
          </h1>
        </div>

        {!token ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p role="alert" className="text-sm text-destructive">
              This reset link is invalid or expired.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-foreground underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={error ? true : undefined}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                aria-invalid={error ? true : undefined}
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 rounded-2xl text-base font-medium"
            >
              {submitting ? "Please wait…" : "Set new password"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

const inputClass = cn(
  "h-12 w-full rounded-2xl border border-input bg-background px-4 text-base",
  "outline-none transition-colors focus-visible:border-ring focus-visible:ring-2",
  "focus-visible:ring-ring/30"
)

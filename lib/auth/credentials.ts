import { z } from "zod"

/**
 * Credential validation for the auth forms. Pure + tested; the login page
 * uses these for inline field errors before hitting Supabase.
 */
export const PASSWORD_MIN = 8

export const EmailSchema = z.string().trim().min(1, "Enter your email.").email("Enter a valid email.")
export const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)

export type FieldError = string | null

export function validateEmail(value: string): FieldError {
  const result = EmailSchema.safeParse(value)
  return result.success ? null : result.error.issues[0]?.message ?? null
}

export function validatePassword(value: string): FieldError {
  const result = PasswordSchema.safeParse(value)
  return result.success ? null : result.error.issues[0]?.message ?? null
}

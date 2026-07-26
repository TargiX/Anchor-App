import { z } from "zod"

export const FOCUS_RESET_CONTEXT_KEY = "anchor-focus-reset-context"
export const FOCUS_RESET_CONTEXT_TTL_MS = 10 * 60 * 1000

const FocusResetContextSchema = z.object({
  nextStep: z.string().trim().min(1),
  createdAt: z.number().finite().nonnegative(),
})

export type FocusResetContext = z.infer<typeof FocusResetContextSchema>

type ContextStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function saveFocusResetContext(
  storage: ContextStorage,
  nextStep: string,
  now = Date.now()
): void {
  const context = FocusResetContextSchema.parse({ nextStep, createdAt: now })
  storage.setItem(FOCUS_RESET_CONTEXT_KEY, JSON.stringify(context))
}

export function saveFocusResetContextFrom(
  getStorage: () => ContextStorage,
  nextStep: string,
  now = Date.now()
): boolean {
  try {
    saveFocusResetContext(getStorage(), nextStep, now)
    return true
  } catch {
    return false
  }
}

export function takeFocusResetContext(
  storage: ContextStorage,
  now = Date.now()
): FocusResetContext | null {
  let raw: string | null
  try {
    raw = storage.getItem(FOCUS_RESET_CONTEXT_KEY)
    storage.removeItem(FOCUS_RESET_CONTEXT_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  const parsed = FocusResetContextSchema.safeParse(value)
  if (!parsed.success) return null

  const age = now - parsed.data.createdAt
  if (age < 0 || age > FOCUS_RESET_CONTEXT_TTL_MS) return null

  return parsed.data
}

export function takeFocusResetContextFrom(
  getStorage: () => ContextStorage,
  now = Date.now()
): FocusResetContext | null {
  try {
    return takeFocusResetContext(getStorage(), now)
  } catch {
    return null
  }
}

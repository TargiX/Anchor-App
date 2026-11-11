/**
 * Shared announcement helpers for the ritual shell (WS-5 accessibility pass).
 *
 * `RitualShell` swaps step content with a framer-motion transition that
 * screen readers do not observe, so the shell renders a visually hidden
 * `role="status"` live region whose text changes with the step.
 */

/**
 * Build the text announced by the ritual shell's screen-reader live region.
 * Clamps the step into `[1, totalSteps]` so an out-of-range step never
 * reads as "Step 0" or past the last step, and falls back to "Daily
 * ritual" when the title is blank.
 */
export function ritualStepAnnouncement(
  step: number,
  totalSteps: number,
  title: string
): string {
  const safeTotal = Math.max(totalSteps, 1)
  const current = Math.min(Math.max(step + 1, 1), safeTotal)
  const ritual = title.trim().length > 0 ? title.trim() : "Daily ritual"

  return `Step ${current} of ${safeTotal}: ${ritual}`
}

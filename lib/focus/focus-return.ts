export const FOCUS_RETURN_PARAM = "after"
export const FOCUS_RETURN_VALUE = "focus"

/**
 * One-shot Focus return marker: Pulse highlights the post-reset check-in only
 * on the arrival that directly follows a completed Focus reset.
 */
export function readFocusReturnFrom(getSearch: () => string): boolean {
  try {
    return new URLSearchParams(getSearch()).get(FOCUS_RETURN_PARAM) === FOCUS_RETURN_VALUE
  } catch {
    return false
  }
}

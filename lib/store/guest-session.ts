/** A cold guest launch restores history; an explicit account logout starts fresh. */
export function shouldResetGuestHistory(
  previousStatus: string | null
): boolean {
  return previousStatus === "authed"
}

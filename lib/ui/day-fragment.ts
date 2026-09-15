/** A day can mount after the browser's initial fragment scroll during hydration. */
export function revealDayFragment(
  date: string,
  expand: () => void
): () => void {
  const hash = `#day-${date}`
  let frame: number | undefined
  const reveal = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    if (window.location.hash !== hash) return
    expand()
    frame = requestAnimationFrame(() => {
      if (window.location.hash === hash) {
        document
          .getElementById(`day-${date}`)
          ?.scrollIntoView({ block: "start" })
      }
    })
  }
  window.addEventListener("hashchange", reveal)
  reveal()
  return () => {
    window.removeEventListener("hashchange", reveal)
    if (frame !== undefined) cancelAnimationFrame(frame)
  }
}

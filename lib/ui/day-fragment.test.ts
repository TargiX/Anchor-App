import { afterEach, expect, it, vi } from "vitest"
import { revealDayFragment } from "./day-fragment"
afterEach(() => vi.unstubAllGlobals())
function fixture(hash: string) {
  const window = {
    location: { hash },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  const scroll = vi.fn()
  const element = vi.fn(() => ({ scrollIntoView: scroll }))
  const request = vi.fn<(callback: FrameRequestCallback) => number>(() => 1)
  const cancel = vi.fn()
  vi.stubGlobal("window", window)
  vi.stubGlobal("document", { getElementById: element })
  vi.stubGlobal("requestAnimationFrame", request)
  vi.stubGlobal("cancelAnimationFrame", cancel)
  return { window, scroll, element, request, cancel }
}
it("expands a late-mounted matching day and scrolls after the next frame", () => {
  const f = fixture("#day-2026-09-16")
  const expand = vi.fn()
  const stop = revealDayFragment("2026-09-16", expand)
  expect(expand).toHaveBeenCalledOnce()
  expect(f.scroll).not.toHaveBeenCalled()
  f.request.mock.calls[0]![0](0)
  expect(f.element).toHaveBeenCalledWith("day-2026-09-16")
  expect(f.scroll).toHaveBeenCalledWith({ block: "start" })
  stop()
  expect(f.cancel).toHaveBeenCalledWith(1)
  expect(f.window.removeEventListener).toHaveBeenCalled()
})
it("does not expand or scroll a nonmatching day", () => {
  const f = fixture("#day-2026-09-15")
  const expand = vi.fn()
  revealDayFragment("2026-09-16", expand)
  expect(expand).not.toHaveBeenCalled()
  expect(f.request).not.toHaveBeenCalled()
})
it("does not scroll to a stale hash if navigation changes before the frame", () => {
  const f = fixture("#day-2026-09-16")
  revealDayFragment("2026-09-16", vi.fn())
  f.window.location.hash = "#day-2026-09-15"
  f.request.mock.calls[0]![0](0)
  expect(f.scroll).not.toHaveBeenCalled()
})

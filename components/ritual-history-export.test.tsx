import { beforeEach, describe, expect, it, vi } from "vitest"

const hooks = vi.hoisted(() => {
  let values: unknown[] = []
  let cursor = 0

  return {
    beginRender() {
      cursor = 0
    },
    reset() {
      values = []
      cursor = 0
    },
    useState<T>(initialValue: T) {
      const index = cursor++
      if (values[index] === undefined) values[index] = initialValue

      return [
        values[index] as T,
        (nextValue: T | ((previousValue: T) => T)) => {
          const previousValue = values[index] as T
          values[index] =
            typeof nextValue === "function"
              ? (nextValue as (previousValue: T) => T)(previousValue)
              : nextValue
        },
      ] as const
    },
    useRef<T>(initialValue: T) {
      const index = cursor++
      if (values[index] === undefined) values[index] = { current: initialValue }

      return values[index] as { current: T }
    },
  }
})

const browser = vi.hoisted(() => ({ shouldFail: true }))
const nativePlatform = vi.hoisted(() => ({ isNative: false }))
const createdLinks: Array<{
  click: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}> = []

vi.mock("react", () => ({
  useRef: hooks.useRef,
  useState: hooks.useState,
  useSyncExternalStore: <T,>(
    _subscribe: () => () => void,
    getSnapshot: () => T
  ) => getSnapshot(),
}))

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => nativePlatform.isNative },
}))

vi.mock("lucide-react", () => ({
  Copy: "copy-icon",
  Download: "download-icon",
  HardDrive: "hard-drive-icon",
}))

vi.mock("@/components/ui/button", () => ({ Button: "button" }))

vi.mock("@/hooks/use-store", () => ({
  useAppState: () => ({
    entries: {
      "2026-07-23": {
        date: "2026-07-23",
        intention: "Finish the export retry.",
      },
    },
    habits: [],
  }),
}))

vi.mock("@/lib/time/today", () => ({ getTodayKey: () => "2026-07-24" }))

import { RitualHistoryExport } from "./ritual-history-export"

type TestElement = {
  props?: Record<string, unknown>
}

function findElement(
  node: unknown,
  predicate: (element: TestElement) => boolean
): TestElement | undefined {
  if (node === null || node === undefined || typeof node !== "object") {
    return undefined
  }

  const element = node as TestElement
  if (predicate(element)) return element

  const children = element.props?.children
  const childNodes = Array.isArray(children) ? children : [children]
  for (const child of childNodes) {
    const found = findElement(child, predicate)
    if (found) return found
  }

  return undefined
}

function textContent(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (node === null || node === undefined || typeof node !== "object") return ""

  const children = (node as TestElement).props?.children
  return (Array.isArray(children) ? children : [children])
    .map(textContent)
    .join("")
}

function renderExport() {
  hooks.beginRender()
  return RitualHistoryExport()
}

function createDeferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe("RitualHistoryExport web download dispatch", () => {
  beforeEach(() => {
    hooks.reset()
    browser.shouldFail = true
    nativePlatform.isNative = false
    createdLinks.length = 0

    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:anchor-history",
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal("document", {
      body: { append: vi.fn() },
      createElement: vi.fn(() => {
        const link = {
          click: vi.fn(() => {
            if (browser.shouldFail) {
              throw new DOMException(
                "forced export dispatch failure",
                "NotSupportedError"
              )
            }
          }),
          remove: vi.fn(),
        }
        createdLinks.push(link)
        return link
      }),
    })
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void) => callback(),
    })
  })

  it("shows an accessible error and keeps retry enabled after synchronous dispatch failure", async () => {
    const initialTree = renderExport()
    const initialButton = findElement(
      initialTree,
      (element) => element.props?.type === "button"
    )
    expect(initialButton?.props?.disabled).toBe(false)

    const onClick = initialButton?.props?.onClick
    expect(typeof onClick).toBe("function")
    ;(onClick as () => void)()
    await Promise.resolve()

    const failedTree = renderExport()
    const status = findElement(
      failedTree,
      (element) => element.props?.role === "status"
    )
    const retryButton = findElement(
      failedTree,
      (element) => element.props?.type === "button"
    )

    expect(textContent(status)).toContain(
      "Could not start the Markdown download"
    )
    expect(retryButton?.props?.disabled).toBe(false)
    expect(createdLinks).toHaveLength(1)
    expect(document.body.append).toHaveBeenCalledWith(createdLinks[0])
    expect(createdLinks[0]?.click).toHaveBeenCalledTimes(1)
    expect(createdLinks[0]?.remove).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:anchor-history")

    browser.shouldFail = false
    ;(retryButton?.props?.onClick as () => void)()
    await Promise.resolve()

    const succeededTree = renderExport()
    const successfulStatus = findElement(
      succeededTree,
      (element) => element.props?.role === "status"
    )
    expect(textContent(successfulStatus)).toContain("Download requested")
    expect(textContent(successfulStatus)).not.toContain(
      "Could not start the Markdown download"
    )
    expect(createdLinks).toHaveLength(2)
    expect(createdLinks[1]?.click).toHaveBeenCalledTimes(1)
    expect(createdLinks[1]?.remove).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})

describe("RitualHistoryExport native clipboard dispatch", () => {
  beforeEach(() => {
    hooks.reset()
    nativePlatform.isNative = true
  })

  it("accepts one pending copy intent and ignores rapid repeats", async () => {
    const pendingCopy = createDeferred()
    const writeText = vi.fn(() => pendingCopy.promise)
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    const initialTree = renderExport()
    const button = findElement(
      initialTree,
      (element) => element.props?.type === "button"
    )
    const onClick = button?.props?.onClick

    expect(typeof onClick).toBe("function")
    ;(onClick as () => void)()
    ;(onClick as () => void)()
    expect(writeText).toHaveBeenCalledTimes(1)

    pendingCopy.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const settledTree = renderExport()
    const status = findElement(
      settledTree,
      (element) => element.props?.role === "status"
    )
    const settledButton = findElement(
      settledTree,
      (element) => element.props?.type === "button"
    )

    expect(textContent(status)).toContain("Copied")
    expect(settledButton?.props?.disabled).toBe(false)
  })

  it("keeps settlement with the active copy attempt and enables a truthful retry after failure", async () => {
    const failedCopy = createDeferred()
    const writeText = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(failedCopy.promise)
      .mockResolvedValueOnce(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    const initialTree = renderExport()
    const initialButton = findElement(
      initialTree,
      (element) => element.props?.type === "button"
    )
    const firstClick = initialButton?.props?.onClick

    expect(typeof firstClick).toBe("function")
    ;(firstClick as () => void)()
    failedCopy.reject(new DOMException("clipboard unavailable", "NotAllowedError"))
    await Promise.resolve()
    await Promise.resolve()

    const failedTree = renderExport()
    const statusAfterFailure = findElement(
      failedTree,
      (element) => element.props?.role === "status"
    )
    const retryButton = findElement(
      failedTree,
      (element) => element.props?.type === "button"
    )

    expect(textContent(statusAfterFailure)).toContain("Could not copy the Markdown")
    expect(retryButton?.props?.disabled).toBe(false)

    ;(retryButton?.props?.onClick as () => void)()
    await Promise.resolve()
    await Promise.resolve()

    const succeededTree = renderExport()
    const finalStatus = findElement(
      succeededTree,
      (element) => element.props?.role === "status"
    )

    expect(writeText).toHaveBeenCalledTimes(2)
    expect(textContent(finalStatus)).toContain("Copied")
    expect(textContent(finalStatus)).not.toContain("Could not copy the Markdown")
  })
})

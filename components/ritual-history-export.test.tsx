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
  }
})

const browser = vi.hoisted(() => ({ shouldFail: true }))

vi.mock("react", () => ({
  useState: hooks.useState,
  useSyncExternalStore: <T,>(
    _subscribe: () => () => void,
    getSnapshot: () => T
  ) => getSnapshot(),
}))

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
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

describe("RitualHistoryExport web download dispatch", () => {
  beforeEach(() => {
    hooks.reset()
    browser.shouldFail = true

    vi.stubGlobal("URL", {
      createObjectURL: () => {
        if (browser.shouldFail) {
          throw new DOMException(
            "forced export dispatch failure",
            "NotSupportedError"
          )
        }
        return "blob:anchor-history"
      },
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal("document", {
      body: { append: vi.fn() },
      createElement: vi.fn(() => ({ click: vi.fn(), remove: vi.fn() })),
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
  })
})

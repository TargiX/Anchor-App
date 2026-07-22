import { Children, isValidElement, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearCloudPersistence, getSnapshot, setState } from "@/lib/store/store"
import { INITIAL_STATE } from "@/lib/store/state"

const componentMocks = vi.hoisted(() => ({
  updateEntry: vi.fn(),
  useEntry: vi.fn(),
}))
const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useState: vi.fn(),
}))

vi.mock("@/lib/store/actions", () => ({
  updateEntry: componentMocks.updateEntry,
}))
vi.mock("@/hooks/use-store", () => ({ useEntry: componentMocks.useEntry }))
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: reactMocks.useEffect,
  useState: reactMocks.useState,
}))

import { StepIntention } from "@/components/morning/step-intention"

const { updateEntry: persistEntry } = await vi.importActual<
  typeof import("@/lib/store/actions")
>("@/lib/store/actions")

const ENTRY_KEY = "2026-07-22"

beforeEach(() => {
  clearCloudPersistence()
  setState(() => INITIAL_STATE)
  componentMocks.updateEntry.mockReset()
  componentMocks.useEntry.mockReturnValue({})
  reactMocks.useEffect.mockReset()
  reactMocks.useState.mockReset()
})

function renderWithText(text: string, onBack = vi.fn()) {
  reactMocks.useState
    .mockImplementationOnce(() => [text, vi.fn()])
    .mockImplementationOnce(() => [[], vi.fn()])

  return {
    tree: StepIntention({ entryKey: ENTRY_KEY, onBack, onNext: vi.fn() }),
    onBack,
  }
}

function findButton(node: unknown, text: string): { onClick: () => void } {
  if (!isValidElement(node)) throw new Error(`Could not find ${text} button`)

  const props = node.props as { children?: unknown; onClick?: () => void }
  if (props.children === text && props.onClick)
    return { onClick: props.onClick }

  for (const child of Children.toArray(props.children as ReactNode)) {
    try {
      return findButton(child, text)
    } catch {
      // Keep walking until the matching button is found.
    }
  }

  throw new Error(`Could not find ${text} button`)
}

describe("Morning intention Back → Continue component/store contract", () => {
  it("persists a typed trimmed draft before Back so Continue can restore it", () => {
    const events: string[] = []
    const onBack = vi.fn(() => events.push("back"))
    componentMocks.updateEntry.mockImplementation((key, patch) => {
      events.push("persist")
      persistEntry(key, patch)
    })

    const { tree } = renderWithText("  Be present today  ", onBack)
    findButton(tree, "Back").onClick()

    expect(events).toEqual(["persist", "back"])
    expect(componentMocks.updateEntry).toHaveBeenCalledWith(ENTRY_KEY, {
      intention: "Be present today",
    })
    expect(getSnapshot().entries[ENTRY_KEY]?.intention).toBe("Be present today")
    expect(onBack).toHaveBeenCalledOnce()
  })

  it("keeps empty or whitespace-only Back actions from creating an entry", () => {
    const { tree, onBack } = renderWithText("   ")
    findButton(tree, "Back").onClick()

    expect(componentMocks.updateEntry).not.toHaveBeenCalled()
    expect(getSnapshot().entries[ENTRY_KEY]).toBeUndefined()
    expect(onBack).toHaveBeenCalledOnce()
  })
})

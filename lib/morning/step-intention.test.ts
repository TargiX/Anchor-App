import { Children, isValidElement, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearCloudPersistence, getSnapshot, setState } from "@/lib/store/store"
import { INITIAL_STATE } from "@/lib/store/state"

const componentMocks = vi.hoisted(() => ({
  updateEntry: vi.fn(),
  useEntry: vi.fn(),
  setRitualCursor: vi.fn(),
  clearRitualCursor: vi.fn(),
  push: vi.fn(),
}))
const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useState: vi.fn(),
}))

vi.mock("@/lib/store/actions", () => ({
  updateEntry: componentMocks.updateEntry,
  setRitualCursor: componentMocks.setRitualCursor,
  clearRitualCursor: componentMocks.clearRitualCursor,
}))
vi.mock("@/hooks/use-store", () => ({ useEntry: componentMocks.useEntry }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: componentMocks.push }),
}))
vi.mock("@/lib/time/today", () => ({ getTodayKey: () => ENTRY_KEY }))
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: reactMocks.useEffect,
  useState: reactMocks.useState,
}))

import { StepIntention } from "@/components/morning/step-intention"
import MorningRitual from "@/app/(app)/morning/page"

const { updateEntry: persistEntry } = await vi.importActual<
  typeof import("@/lib/store/actions")
>("@/lib/store/actions")

const ENTRY_KEY = "2026-07-22"

beforeEach(() => {
  clearCloudPersistence()
  setState(() => INITIAL_STATE)
  componentMocks.updateEntry.mockReset()
  componentMocks.setRitualCursor.mockReset()
  componentMocks.clearRitualCursor.mockReset()
  componentMocks.push.mockReset()
  componentMocks.useEntry.mockReturnValue({})
  reactMocks.useEffect.mockReset()
  reactMocks.useState.mockReset()
})

function renderWithText(
  text: string,
  onBack = vi.fn(),
  suggestions = ["Suggestion one", "Suggestion two", "Suggestion three"]
) {
  reactMocks.useState.mockImplementationOnce(() => [text, vi.fn()])

  return {
    tree: StepIntention({
      entryKey: ENTRY_KEY,
      suggestions,
      onBack,
      onNext: vi.fn(),
    }),
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

function stepChild(tree: unknown) {
  if (!isValidElement(tree)) throw new Error("Could not find ritual shell")

  const child = Children.toArray(
    (tree.props as { children?: ReactNode }).children
  ).find(isValidElement)
  if (!isValidElement(child)) throw new Error("Could not find ritual step")

  return child
}

function installPersistentPageState() {
  const slots: unknown[] = []
  let cursor = 0

  reactMocks.useState.mockImplementation((initial: unknown) => {
    const slot = cursor++
    if (!(slot in slots)) {
      slots[slot] = typeof initial === "function" ? initial() : initial
    }

    return [slots[slot], vi.fn()]
  })

  return () => {
    cursor = 0
  }
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

  it("keeps the parent-held suggestion subset and order through Intention → Stillness → Back", () => {
    let step = 3
    componentMocks.useEntry.mockImplementation(() => ({
      morningRitualStep: step,
    }))
    const restartRender = installPersistentPageState()

    const intention = stepChild(MorningRitual())
    const initialSuggestions = (
      intention.props as { suggestions: string[]; onNext: () => void }
    ).suggestions

    expect(initialSuggestions).toHaveLength(3)
    ;(intention.props as { onNext: () => void }).onNext()
    expect(componentMocks.setRitualCursor).toHaveBeenLastCalledWith(
      "morning",
      4,
      ENTRY_KEY
    )

    step = 4
    restartRender()
    const stillness = stepChild(MorningRitual())
    ;(stillness.props as { onBack: () => void }).onBack()
    expect(componentMocks.setRitualCursor).toHaveBeenLastCalledWith(
      "morning",
      3,
      ENTRY_KEY
    )

    step = 3
    restartRender()
    const returnedIntention = stepChild(MorningRitual())

    expect(
      (returnedIntention.props as { suggestions: string[] }).suggestions
    ).toEqual(initialSuggestions)
  })
})

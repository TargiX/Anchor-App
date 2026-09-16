import { describe, expect, it, vi } from "vitest"
import {
  appendDictation,
  createDictationSession,
  type DictationPort,
  type DictationResult,
} from "./dictation"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function fixture() {
  const recognition = deferred<DictationResult>()
  const remove = vi.fn(async () => {})
  let emit!: Parameters<DictationPort["addListener"]>[1]
  const port: DictationPort = {
    availability: vi.fn(async () => ({ supported: true })),
    start: vi.fn(() => recognition.promise),
    stop: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    addListener: vi.fn(async (_, listener) => {
      emit = listener
      return { remove }
    }),
  }
  const callbacks = { phase: vi.fn(), result: vi.fn(), error: vi.fn() }
  const session = createDictationSession(port, callbacks, () => "owned-session")
  return {
    port,
    callbacks,
    session,
    recognition,
    remove,
    emit: (state: "recording", id = "owned-session") => emit({ id, state }),
  }
}

describe("dictation session ownership", () => {
  it("attaches before capture and returns a reviewable result only at completion", async () => {
    const f = fixture()
    const run = f.session.start("ru-RU")
    await Promise.resolve()
    expect(f.port.start).toHaveBeenCalledWith({
      id: "owned-session",
      locale: "ru-RU",
    })
    f.emit("recording", "someone-else")
    expect(f.callbacks.phase).not.toHaveBeenCalledWith("recording")
    f.emit("recording")
    expect(f.callbacks.phase).toHaveBeenLastCalledWith("recording")
    expect(f.callbacks.result).not.toHaveBeenCalled()
    await f.session.stop()
    expect(f.port.stop).toHaveBeenCalledWith({ id: "owned-session" })
    f.recognition.resolve({ text: "A useful thought", reason: "stopped" })
    await run
    expect(f.callbacks.result).toHaveBeenCalledWith({
      text: "A useful thought",
      reason: "stopped",
    })
    expect(f.remove).toHaveBeenCalledOnce()
  })
  it("ignores late speech after cancellation or navigation", async () => {
    const f = fixture()
    const run = f.session.start("en-US")
    await Promise.resolve()
    f.session.cancel()
    f.recognition.resolve({ text: "Private old draft", reason: "completed" })
    await run
    expect(f.port.cancel).toHaveBeenCalledWith({ id: "owned-session" })
    expect(f.callbacks.result).not.toHaveBeenCalled()
  })
  it("never starts the microphone when cancelled during listener setup", async () => {
    const f = fixture()
    const listener = deferred<{ remove(): Promise<void> }>()
    vi.mocked(f.port.addListener).mockReturnValue(listener.promise)
    const run = f.session.start("en-US")
    f.session.cancel()
    listener.resolve({ remove: f.remove })
    await run
    expect(f.port.start).not.toHaveBeenCalled()
    expect(f.remove).toHaveBeenCalledOnce()
  })
  it("rejects double starts and cleans up recognition errors", async () => {
    const f = fixture()
    const run = f.session.start("en-US")
    await f.session.start("ru-RU")
    f.recognition.reject(new Error("permission denied"))
    await run
    expect(f.port.start).toHaveBeenCalledOnce()
    expect(f.callbacks.error).toHaveBeenCalledOnce()
    expect(f.remove).toHaveBeenCalledOnce()
  })
  it("cancels its own recording if stop fails", async () => {
    const f = fixture()
    const run = f.session.start("en-US")
    await Promise.resolve()
    vi.mocked(f.port.stop).mockRejectedValue(new Error("bridge failure"))
    await f.session.stop()
    f.recognition.resolve({ text: "Late", reason: "stopped" })
    await run
    expect(f.port.cancel).toHaveBeenCalledWith({ id: "owned-session" })
    expect(f.callbacks.error).toHaveBeenCalledOnce()
    expect(f.callbacks.result).not.toHaveBeenCalled()
  })
})

describe("adding a voice draft", () => {
  it("preserves existing words and appends only the reviewed text", () => {
    expect(appendDictation("My note ", "  More words  ", 100)).toBe(
      "My note \nMore words"
    )
    expect(appendDictation("", "Привет", 100)).toBe("Привет")
  })
  it("does not silently truncate overflow or accept empty speech", () => {
    expect(appendDictation("abc", "de", 5)).toBeNull()
    expect(appendDictation("abc", "de", 6)).toBe("abc\nde")
    expect(appendDictation("abc", " ", 100)).toBeNull()
  })
})

export type DictationPhase = "starting" | "recording" | "finishing"
export interface DictationResult {
  text: string
  reason: string
}
export interface DictationPort {
  availability(options: { locale: string }): Promise<{ supported: boolean }>
  start(options: { id: string; locale: string }): Promise<DictationResult>
  stop(options: { id: string }): Promise<void>
  cancel(options: { id: string }): Promise<void>
  addListener(
    event: "state",
    listener: (event: { id: string; state: DictationPhase }) => void
  ): Promise<{ remove(): Promise<void> }>
}

/** A cancelled or unmounted recording must never append text to another draft. */
export function createDictationSession(
  port: DictationPort,
  callbacks: {
    phase(value: DictationPhase): void
    result(value: DictationResult): void
    error(): void
  },
  makeID = () => crypto.randomUUID()
) {
  let active: { id: string; started: boolean } | null = null
  return {
    async start(locale: string) {
      if (active) return
      const session = { id: makeID(), started: false }
      active = session
      callbacks.phase("starting")
      let listener: { remove(): Promise<void> } | undefined
      try {
        listener = await port.addListener("state", (event) => {
          if (active === session && event.id === session.id)
            callbacks.phase(event.state)
        })
        if (active !== session) return
        session.started = true
        const result = await port.start({ id: session.id, locale })
        if (active === session) callbacks.result(result)
      } catch {
        if (active === session) callbacks.error()
      } finally {
        if (active === session) active = null
        await listener?.remove().catch(() => {})
      }
    },
    async stop() {
      if (!active) return
      const session = active
      callbacks.phase("finishing")
      try {
        await port.stop({ id: session.id })
      } catch {
        if (active === session) {
          active = null
          callbacks.error()
        }
        await port.cancel({ id: session.id }).catch(() => {})
      }
    },
    cancel() {
      const session = active
      active = null
      if (session?.started) void port.cancel({ id: session.id }).catch(() => {})
    },
  }
}

/** Preserve the existing note and reject overflow instead of silently truncating speech. */
export function appendDictation(
  note: string,
  transcript: string,
  limit: number
): string | null {
  const speech = transcript.trim()
  if (!speech) return null
  const combined = note ? `${note}\n${speech}` : speech
  return combined.length <= limit ? combined : null
}

import { describe, expect, it } from "vitest"
import {
  createCheckInFromTranscript,
  createImmediateReflection,
  createWeeklyDigest,
} from "./checkin"

describe("Anchor voice check-in MVP", () => {
  it("extracts a morning voice transcript into one main intention and raw mentions", () => {
    const checkIn = createCheckInFromTranscript({
      transcript:
        "бля, спал хреново часа четыре, голова тяжёлая, сегодня надо добить этот чёртов PR и не забыть позвонить маме, дедлайн по X опять давит",
      now: new Date("2026-07-05T09:10:00+07:00"),
      kind: "morning",
    })

    expect(checkIn.kind).toBe("morning")
    expect(checkIn.dayKey).toBe("2026-07-05")
    expect(checkIn.sleep.hoursApprox).toBe(4)
    expect(checkIn.sleep.quality).toBe(2)
    expect(checkIn.mood.energy).toBe(-2)
    expect(checkIn.mood.valence).toBe(-1)
    expect(checkIn.mood.words).toEqual(
      expect.arrayContaining(["спал хреново", "голова тяжёлая", "дедлайн по X давит"])
    )
    expect(checkIn.intention.main).toBe("добить этот чёртов PR")
    expect(checkIn.intention.rest).toContain("позвонить маме")
    expect(checkIn.mentions).toEqual(
      expect.arrayContaining([
        { kind: "task", text: "позвонить маме" },
        { kind: "body", text: "голова тяжёлая" },
        { kind: "worry", text: "дедлайн по X давит" },
      ])
    )
  })

  it("keeps an immediate morning reflection short and in the user's words", () => {
    const checkIn = createCheckInFromTranscript({
      transcript:
        "спал плохо, голова тяжёлая, надо добить PR и купить кофе",
      now: new Date("2026-07-05T09:10:00+07:00"),
      kind: "morning",
    })

    const reflection = createImmediateReflection(checkIn)

    expect(reflection.split("\n").length).toBeLessThanOrEqual(6)
    expect(reflection).toContain("🌅 Записал")
    expect(reflection).toContain("голова тяжёлая")
    expect(reflection).toContain("добить PR")
    expect(reflection).not.toMatch(/стрик|молодец|рекомендую/i)
  })

  it("closes the evening loop against the morning intention", () => {
    const morning = createCheckInFromTranscript({
      transcript: "сегодня надо добить PR",
      now: new Date("2026-07-05T09:10:00+07:00"),
      kind: "morning",
    })
    const evening = createCheckInFromTranscript({
      transcript: "PR почти добил, но застрял на ревью, маме позвонил, день мутный",
      now: new Date("2026-07-05T22:15:00+07:00"),
      kind: "evening",
      morningIntention: morning.intention.main,
    })

    expect(evening.evening.mainOutcome).toBe("partial")
    expect(evening.evening.lowlight).toBe("застрял на ревью")
    expect(evening.mentions).toEqual(
      expect.arrayContaining([{ kind: "task", text: "маме позвонил" }])
    )

    const reflection = createImmediateReflection(evening, morning)
    expect(reflection).toContain("Утром главным было")
    expect(reflection).toContain("частично")
  })

  it("uses the shared local-time helper for Saigon day keys and timestamps", () => {
    const checkIn = createCheckInFromTranscript({
      transcript: "вечером надо закрыть заметки",
      now: new Date("2026-07-04T18:30:00Z"),
    })

    expect(checkIn.kind).toBe("evening")
    expect(checkIn.dayKey).toBe("2026-07-05")
    expect(checkIn.ts).toBe("2026-07-05T01:30:00+07:00")
  })

  it("flags broader Russian self-harm phrasing before normal reflection", () => {
    const riskyPhrases = [
      "я не хочу жить, всё давит",
      "смысла жить нет вообще",
      "иногда хочется умереть",
      "думаю покончить с собой",
      "хочется выйти в окно",
    ]

    for (const transcript of riskyPhrases) {
      const checkIn = createCheckInFromTranscript({
        transcript,
        now: new Date("2026-07-05T22:15:00+07:00"),
      })
      expect(checkIn.flags.needsAttention).toBe(true)
      expect(createImmediateReflection(checkIn)).toContain("напиши живому человеку")
    }
  })

  it("creates weekly digest insights only when there is a countable basis", () => {
    const records = [
      createCheckInFromTranscript({
        transcript: "спал 4 часа, надо добить PR",
        now: new Date("2026-07-01T09:00:00+07:00"),
        kind: "morning",
      }),
      createCheckInFromTranscript({
        transcript: "PR не сделал, вырубило",
        now: new Date("2026-07-01T22:00:00+07:00"),
        kind: "evening",
        morningIntention: "добить PR",
      }),
      createCheckInFromTranscript({
        transcript: "спал 5 часов, дедлайн по X давит, надо закрыть ревью",
        now: new Date("2026-07-02T09:00:00+07:00"),
        kind: "morning",
      }),
      createCheckInFromTranscript({
        transcript: "ревью частично, дедлайн по X давит",
        now: new Date("2026-07-02T22:00:00+07:00"),
        kind: "evening",
        morningIntention: "закрыть ревью",
      }),
      createCheckInFromTranscript({
        transcript: "спал 8 часов, сходил в зал, добил PR",
        now: new Date("2026-07-03T22:00:00+07:00"),
        kind: "evening",
        morningIntention: "добить PR",
      }),
    ]

    const digest = createWeeklyDigest(records)

    expect(digest).toContain("📊 Anchor")
    expect(digest).toMatch(/Сон <6ч был 2 раза/i)
    expect(digest).toContain("дедлайн по X давит")
    expect(digest).toMatch(/\d+ дн(я|ей|ь)/)
    expect(digest).not.toMatch(/стрик|ты пропустил/i)
  })
})

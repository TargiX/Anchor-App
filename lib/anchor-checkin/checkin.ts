import { z } from "zod"
import { getLocalDayKey, getLocalHour, getLocalTimestamp } from "@/lib/time/today"

export const CheckInKindSchema = z.enum(["morning", "evening", "spontaneous"])
export type CheckInKind = z.infer<typeof CheckInKindSchema>

export const MentionKindSchema = z.enum([
  "task",
  "person",
  "worry",
  "body",
  "win",
  "idea",
  "place",
  "other",
])
export type MentionKind = z.infer<typeof MentionKindSchema>

export const AnchorCheckInSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: CheckInKindSchema,
  raw: z.object({
    transcript: z.string(),
    durationSec: z.number().nullable(),
  }),
  mood: z.object({
    valence: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]).nullable(),
    energy: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]).nullable(),
    words: z.array(z.string()),
  }),
  sleep: z.object({
    quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
    hoursApprox: z.number().nullable(),
    note: z.string().nullable(),
  }),
  intention: z.object({
    main: z.string().nullable(),
    rest: z.array(z.string()),
  }),
  mentions: z.array(
    z.object({
      kind: MentionKindSchema,
      text: z.string(),
    })
  ),
  evening: z.object({
    mainOutcome: z.enum(["done", "partial", "not_done", "not_mentioned"]).nullable(),
    highlight: z.string().nullable(),
    lowlight: z.string().nullable(),
  }),
  flags: z.object({
    needsAttention: z.boolean(),
    isTooVague: z.boolean(),
  }),
})

export type AnchorCheckIn = z.infer<typeof AnchorCheckInSchema>

export type CreateCheckInInput = {
  transcript: string
  now?: Date
  kind?: CheckInKind
  durationSec?: number | null
  morningIntention?: string | null
}

// Anchor is a single-user founder app, so dayKey/inferKind anchor on the
// founder's calendar (Asia/Saigon) rather than the process TZ. Keep the
// date/time derivation centralized in `lib/time/today` to avoid UTC day-key bugs.
// See `docs/anchor-hermes-checkin-experiment.md` for the rationale.
const LOCAL_TIME_ZONE = "Asia/Saigon"

function dayKeyFor(date: Date): string {
  return getLocalDayKey(date, LOCAL_TIME_ZONE)
}

function inferKind(date: Date): CheckInKind {
  const hour = getLocalHour(date, LOCAL_TIME_ZONE)
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 18 || hour < 3) return "evening"
  return "spontaneous"
}

function stableId(dayKey: string, kind: CheckInKind): string {
  // Per-submission UUID: the previous dayKey+kind+hash-of-transcript ID collided
  // on identical resubmissions (no dedup in appendCheckIn) and produced the
  // same row on legitimate client retries. crypto.randomUUID() is universally
  // available in the Node 24 / modern-browser targets this app serves.
  return `${dayKey}-${kind}-${crypto.randomUUID()}`
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function extractHours(text: string): number | null {
  const digitMatch = text.match(/(?:часа|часов|ч|h|hours?)\s*(\d+(?:[.,]\d+)?)/i) ?? text.match(/(\d+(?:[.,]\d+)?)\s*(?:часа|часов|ч|h|hours?)/i)
  if (digitMatch?.[1]) return Number(digitMatch[1].replace(",", "."))

  const wordHours: Array<[RegExp, number]> = [
    [/четыре|четырёх/i, 4],
    [/пять|пяти/i, 5],
    [/шесть|шести/i, 6],
    [/семь|семи/i, 7],
    [/восемь|восьми/i, 8],
  ]
  const hourContext = text.match(/(?:спал|сон|sleep)[^.!,;]*/i)?.[0] ?? text
  return wordHours.find(([pattern]) => pattern.test(hourContext))?.[1] ?? null
}

function extractMood(transcript: string): AnchorCheckIn["mood"] {
  const text = transcript.toLowerCase()
  const words: string[] = []

  if (text.includes("голова тяж")) words.push("голова тяжёлая")
  if (text.includes("спал хреново")) words.push("спал хреново")
  else if (text.includes("спал плохо")) words.push("спал плохо")
  if (text.includes("день мутн")) words.push("день мутный")
  if (text.includes("тревож")) words.push("тревожно")
  if (text.includes("дедлайн") && text.includes("давит")) {
    const originalX = /дедлайн по\s+([a-zа-я0-9_-]+)/i.exec(transcript)?.[1]
    words.push(`дедлайн по ${originalX ?? "X"} давит`)
  }

  const lowEnergy = includesAny(text, ["вырубило", "выжат", "устал", "голова тяж", "спал плохо", "спал хреново"])
  const highEnergy = includesAny(text, ["заряж", "энерг", "бодр", "сходил в зал", "зал"])
  const negative = includesAny(text, ["хреново", "плохо", "мутн", "тревож", "давит", "болел", "болит", "застрял"])
  const positive = includesAny(text, ["добил", "сделал", "получилось", "норм", "хорош", "сходил в зал"])

  return {
    valence: negative ? -1 : positive ? 1 : null,
    energy: lowEnergy ? -2 : highEnergy ? 1 : null,
    words: Array.from(new Set(words)),
  }
}

function extractSleep(transcript: string): AnchorCheckIn["sleep"] {
  const text = transcript.toLowerCase()
  const hoursApprox = extractHours(transcript)
  const mentioned = includesAny(text, ["сон", "спал", "sleep", "выспал"])
  const bad = includesAny(text, ["спал плохо", "спал хреново", "не высп", "сон плох"])
  const good = includesAny(text, ["спал хорошо", "выспался", "сон норм", "8 часов", "восемь"])

  return {
    quality: bad ? 2 : good ? 4 : hoursApprox !== null && hoursApprox < 6 ? 2 : mentioned ? 3 : null,
    hoursApprox,
    note: bad ? (text.includes("хреново") ? "спал хреново" : "спал плохо") : good ? "спал хорошо" : null,
  }
}

function cleanupTask(text: string): string {
  return text
    .replace(/^(сегодня\s+)?(надо|нужно|надо бы|не забыть|и не забыть|на завтра)\s+/i, "")
    .replace(/\s+и\s+не\s+забыть\s+.*$/i, "")
    .replace(/[,.!;]+$/g, "")
    .trim()
}

function extractTasks(transcript: string): string[] {
  const tasks: string[] = []
  const patterns = [
    /(?:сегодня\s+)?(?:надо|нужно|надо бы)\s+([^,.!;]+)/gi,
    /(?:не забыть|и не забыть)\s+([^,.!;]+)/gi,
    /(?:на завтра)\s+([^,.!;]+)/gi,
  ]

  for (const pattern of patterns) {
    for (const match of transcript.matchAll(pattern)) {
      const task = cleanupTask(match[0])
      if (task) tasks.push(task)
    }
  }

  const lower = transcript.toLowerCase()
  if (lower.includes("маме позвонил") && !tasks.includes("маме позвонил")) {
    tasks.push("маме позвонил")
  }

  return Array.from(new Set(tasks)).slice(0, 5)
}

function extractMentions(transcript: string, tasks: string[]): AnchorCheckIn["mentions"] {
  const text = transcript.toLowerCase()
  const mentions: AnchorCheckIn["mentions"] = []

  for (const task of tasks) mentions.push({ kind: "task", text: task })
  if (text.includes("голова тяж")) mentions.push({ kind: "body", text: "голова тяжёлая" })
  if (text.includes("голова") && (text.includes("болит") || text.includes("болела"))) {
    mentions.push({ kind: "body", text: "голова болела" })
  }
  if (text.includes("дедлайн") && text.includes("давит")) {
    const originalX = /дедлайн по\s+([a-zа-я0-9_-]+)/i.exec(transcript)?.[1]
    mentions.push({ kind: "worry", text: `дедлайн по ${originalX ?? "X"} давит` })
  }
  if (text.includes("мам")) mentions.push({ kind: "person", text: "мама" })
  if (text.includes("зал")) mentions.push({ kind: "win", text: "зал" })

  return mentions.filter(
    (mention, index, all) =>
      all.findIndex((item) => item.kind === mention.kind && item.text === mention.text) === index
  )
}

function outcomeFrom(transcript: string): AnchorCheckIn["evening"]["mainOutcome"] {
  const text = transcript.toLowerCase()
  if (includesAny(text, ["почти", "частично", "застрял", "не до конца"])) return "partial"
  if (includesAny(text, ["не сделал", "не добил", "не получилось", "вырубило"])) return "not_done"
  if (includesAny(text, ["сделал", "добил", "закрыл", "получилось"])) return "done"
  return "not_mentioned"
}

function extractLowlight(transcript: string): string | null {
  const text = transcript.toLowerCase()
  if (text.includes("застрял на ревью")) return "застрял на ревью"
  if (text.includes("день мутн")) return "день мутный"
  if (text.includes("голова") && (text.includes("болит") || text.includes("болела"))) return "голова болела"
  return null
}

function extractHighlight(transcript: string): string | null {
  const text = transcript.toLowerCase()
  if (text.includes("маме позвонил")) return "маме позвонил"
  if (text.includes("добил")) return "добил"
  if (text.includes("сходил в зал")) return "сходил в зал"
  return null
}

const CRISIS_PATTERNS = [
  /не\s+хоч(?:у|ется)\s+жить/,
  /(?:нет\s+смысла\s+жить|смысла\s+жить\s+нет|жить\s+бессмысленн)/,
  /(?:убить|убью)\s+себя/,
  /поконч(?:ить|у)\s+с\s+собой/,
  /(?:суицид|самоубийств)/,
  /(?:хочу|хочется|лучше)\s+умереть/,
  /(?:выйти\s+в\s+окно|шагнуть\s+с\s+крыши|перерезать\s+(?:себе\s+)?вены)/,
] as const

function crisisFlag(text: string): boolean {
  const normalized = text.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim()
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function createCheckInFromTranscript(input: CreateCheckInInput): AnchorCheckIn {
  const now = input.now ?? new Date()
  const transcript = input.transcript.trim()
  const kind = input.kind ?? inferKind(now)
  const dayKey = dayKeyFor(now)
  const tasks = extractTasks(transcript)
  const mood = extractMood(transcript)
  const checkIn: AnchorCheckIn = {
    id: stableId(dayKey, kind),
    ts: getLocalTimestamp(now, LOCAL_TIME_ZONE),
    dayKey,
    kind,
    raw: {
      transcript,
      durationSec: input.durationSec ?? null,
    },
    mood,
    sleep: extractSleep(transcript),
    intention: {
      main: kind === "morning" ? (tasks[0] ?? null) : null,
      rest: kind === "morning" ? tasks.slice(1, 3) : [],
    },
    mentions: extractMentions(transcript, tasks),
    evening: {
      mainOutcome: kind === "evening" ? outcomeFrom(transcript) : null,
      highlight: kind === "evening" ? extractHighlight(transcript) : null,
      lowlight: kind === "evening" ? extractLowlight(transcript) : null,
    },
    flags: {
      needsAttention: crisisFlag(transcript),
      isTooVague: transcript.length > 0 && transcript.length <= 8,
    },
  }

  return AnchorCheckInSchema.parse(checkIn)
}

function moodLine(checkIn: AnchorCheckIn): string {
  return checkIn.mood.words.length > 0 ? checkIn.mood.words.join(", ") : "не зафиксировал явно"
}

function sleepLine(checkIn: AnchorCheckIn): string | null {
  if (checkIn.sleep.hoursApprox !== null && checkIn.sleep.quality !== null) {
    const quality = checkIn.sleep.quality <= 2 ? "паршиво" : checkIn.sleep.quality >= 4 ? "нормально" : "средне"
    return `~${checkIn.sleep.hoursApprox} часа, ${quality}`
  }
  if (checkIn.sleep.note) return checkIn.sleep.note
  return null
}

export function createImmediateReflection(checkIn: AnchorCheckIn, morning?: AnchorCheckIn | null): string {
  if (checkIn.flags.needsAttention) {
    return "Я рядом. Это звучит тяжело. Лучше сейчас не разбирать это как чек-ин — напиши живому человеку рядом или в экстренную помощь, если есть риск для тебя."
  }

  if (checkIn.kind === "evening") {
    const lines = ["🌙 Записал."]
    if (morning?.intention.main) {
      const outcome = checkIn.evening.mainOutcome === "partial" ? "частично" : checkIn.evening.mainOutcome === "done" ? "сделано" : checkIn.evening.mainOutcome === "not_done" ? "не закрыто" : "не ясно"
      lines.push(`Утром главным было “${morning.intention.main}” — ${outcome}.`)
    } else if (checkIn.evening.mainOutcome) {
      lines.push(`День: ${checkIn.evening.mainOutcome}`)
    }
    if (checkIn.evening.highlight) lines.push(`Плюс: ${checkIn.evening.highlight}`)
    if (checkIn.evening.lowlight) lines.push(`Тяжёлое: ${checkIn.evening.lowlight}`)
    const tomorrow = checkIn.mentions.filter((m) => m.kind === "task").slice(0, 2).map((m) => m.text)
    if (tomorrow.length > 0) lines.push(`На завтра держу: ${tomorrow.join(", ")}`)
    return lines.slice(0, 6).join("\n")
  }

  if (checkIn.kind === "spontaneous") {
    const nextStep = checkIn.mentions.find((mention) => mention.kind === "task")?.text
    const lines = ["⏸ Пауза зафиксирована.", `Сейчас: ${moodLine(checkIn)}`]
    if (nextStep) lines.push(`Один следующий шаг: ${nextStep}`)
    else lines.push("Не нужно раскладывать всё. Дай себе десять минут и вернись к одному простому делу.")
    return lines.slice(0, 4).join("\n")
  }

  const lines = ["🌅 Записал.", `Состояние: ${moodLine(checkIn)}`]
  const sleep = sleepLine(checkIn)
  if (sleep) lines.push(`Сон: ${sleep}`)
  if (checkIn.intention.main) lines.push(`Главное сегодня: ${checkIn.intention.main}`)
  if (checkIn.intention.rest.length > 0) lines.push(`Ещё держу: ${checkIn.intention.rest.slice(0, 2).join(", ")}`)
  return lines.slice(0, 6).join("\n")
}

export function createWeeklyDigest(records: AnchorCheckIn[]): string {
  const valid = records.filter((record) => !record.flags.needsAttention)
  if (valid.length < 3) {
    return "📊 Anchor: данных пока мало.\nНа следующую неделю: отвечай как попало, даже одним предложением — ценность появится из повторов."
  }

  const insights: string[] = []
  const lowSleep = valid.filter((record) => (record.sleep.hoursApprox ?? 99) < 6)
  if (lowSleep.length >= 2) {
    const lowSleepDays = new Set(lowSleep.map((record) => record.dayKey))
    const poorOutcomes = valid.filter(
      (record) =>
        lowSleepDays.has(record.dayKey) &&
        record.kind === "evening" &&
        (record.evening.mainOutcome === "partial" || record.evening.mainOutcome === "not_done")
    ).length
    insights.push(
      `Сон <6ч был ${lowSleep.length} раза — тяжёлые/частичные закрытия всплыли ${poorOutcomes} из ${lowSleepDays.size}.`
    )
  }

  const mentionCounts = new Map<string, number>()
  for (const record of valid) {
    for (const mention of record.mentions.filter((m) => m.kind === "worry" || m.kind === "body" || m.kind === "task")) {
      mentionCounts.set(mention.text, (mentionCounts.get(mention.text) ?? 0) + 1)
    }
  }
  const repeated = [...mentionCounts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1])[0]
  if (repeated) {
    insights.push(`“${repeated[0]}” повторилось ${repeated[1]} раза — это уже не фон, а заметный паттерн.`)
  }

  const checkInDays = new Set(valid.map((record) => record.dayKey)).size
  insights.push(`Чек-инов с данными: ${valid.length} за ${checkInDays} дней — этого ${valid.length >= 5 ? "уже хватает для первых сигналов" : "пока мало, но формат живой"}.`)

  return [
    "📊 Anchor: неделя в фактах",
    "",
    ...insights.slice(0, 3).map((insight, index) => `${index + 1}. ${insight}`),
    "",
    "На следующую неделю: если спал <6ч — ставь главным один маленький next step, не “закрыть всё”.",
  ].join("\n")
}

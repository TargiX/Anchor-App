import type { DayEntry } from "./entry"
import type { Habit } from "./habit"

export interface RitualHistoryExportInput {
  entries: Record<string, DayEntry>
  habits: Habit[]
  exportedOn: string
}

export interface RitualHistoryExport {
  filename: string
  markdown: string
  entryCount: number
}

function hasRecordedField(
  entry: DayEntry,
  configuredHabitIds: Set<string>
): boolean {
  return Object.entries(entry).some(([field, value]) => {
    if (field === "date" || value === undefined) return false
    if (field === "habitsCompleted") {
      return (value as string[]).some((id) => configuredHabitIds.has(id))
    }
    if (field === "meditationMinutes") return (value as number) > 0
    return typeof value !== "string" || value.trim().length > 0
  })
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

function quantity(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`
}

function escapeMarkdownInline(value: string): string {
  const markdownCharacters = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
  const singleLineValue = value.replace(/[\r\n]+/g, " ")
  return Array.from(singleLineValue, (character) =>
    markdownCharacters.has(character) ? `\\${character}` : character
  ).join("")
}

function textSection(title: string, value: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...(value.match(/`+/g) ?? []).map((run) => run.length)
  )
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1))
  return `### ${title}\n\n${fence}text\n${value}\n${fence}`
}

function entryMarkdown(entry: DayEntry, habits: Habit[]): string {
  const sections: string[] = [`## ${entry.date}`]

  if (entry.morningMood) {
    sections.push(
      `**Morning mood:** Energy ${percentage(entry.morningMood.energy)} · valence ${percentage(entry.morningMood.valence)}`
    )
  }

  if (entry.sleepHours !== undefined || entry.sleepQuality !== undefined) {
    const sleep = [
      entry.sleepHours === undefined
        ? null
        : quantity(entry.sleepHours, "hour"),
      entry.sleepQuality ?? null,
    ].filter(Boolean)
    sections.push(`**Sleep:** ${sleep.join(" · ")}`)
  }

  if (entry.intention?.trim()) {
    sections.push(textSection("Intention", entry.intention))
  }

  if (entry.meditationMinutes !== undefined && entry.meditationMinutes > 0) {
    sections.push(
      `**Meditation:** ${quantity(entry.meditationMinutes, "minute")}`
    )
  }

  if (entry.affirmation?.trim()) {
    sections.push(textSection("Affirmation", entry.affirmation))
  }

  if (entry.eveningMood) {
    sections.push(
      `**Evening mood:** Energy ${percentage(entry.eveningMood.energy)} · valence ${percentage(entry.eveningMood.valence)}`
    )
  }

  if (entry.journal?.trim()) {
    sections.push(textSection("Journal", entry.journal))
  }

  if (entry.habitsCompleted !== undefined) {
    const completedNames = entry.habitsCompleted
      .map((id) => habits.find((habit) => habit.id === id)?.name)
      .filter((name): name is string => name !== undefined)
    if (completedNames.length > 0) {
      sections.push(
        `### Completed habits\n\n${completedNames
          .map((name) => `- ${escapeMarkdownInline(name)}`)
          .join("\n")}`
      )
    }
  }

  if (
    entry.tomorrowBedtime !== undefined ||
    entry.tomorrowSleepHours !== undefined
  ) {
    const sleepWindow = [
      entry.tomorrowBedtime ?? null,
      entry.tomorrowSleepHours === undefined
        ? null
        : quantity(entry.tomorrowSleepHours, "hour"),
    ].filter(Boolean)
    sections.push(`**Tomorrow's sleep window:** ${sleepWindow.join(" · ")}`)
  }

  return sections.join("\n\n")
}

export function createRitualHistoryExport(
  input: RitualHistoryExportInput
): RitualHistoryExport | null {
  const configuredHabitIds = new Set(input.habits.map((habit) => habit.id))
  const entries = Object.values(input.entries)
    .filter((entry) => hasRecordedField(entry, configuredHabitIds))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (entries.length === 0) return null

  const configuredHabits =
    input.habits.length > 0
      ? input.habits
          .map((habit) => `- ${escapeMarkdownInline(habit.name)}`)
          .join("\n")
      : "None configured."
  const markdown = [
    "# Anchor ritual history",
    `Exported locally on ${input.exportedOn}. This file was created on this device; Anchor did not upload it.`,
    `## Configured habits\n\n${configuredHabits}`,
    ...entries.map((entry) => entryMarkdown(entry, input.habits)),
  ].join("\n\n")

  return {
    filename: `anchor-ritual-history-${input.exportedOn}.md`,
    markdown: `${markdown}\n`,
    entryCount: entries.length,
  }
}

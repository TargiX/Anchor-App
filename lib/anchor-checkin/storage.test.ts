import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createCheckInFromTranscript } from "./checkin"
import { appendCheckIn, listCheckIns } from "./storage"

let tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
  tempDirs = []
})

describe("Anchor check-in JSONL storage", () => {
  it("appends and reads check-ins in chronological order", async () => {
    const dir = await mkdtemp(join(tmpdir(), "anchor-checkins-"))
    tempDirs.push(dir)

    const first = createCheckInFromTranscript({
      transcript: "надо добить PR",
      now: new Date("2026-07-05T09:00:00+07:00"),
      kind: "morning",
    })
    const second = createCheckInFromTranscript({
      transcript: "PR частично, застрял на ревью",
      now: new Date("2026-07-05T22:00:00+07:00"),
      kind: "evening",
      morningIntention: first.intention.main,
    })

    await appendCheckIn(first, { dir })
    await appendCheckIn(second, { dir })

    const records = await listCheckIns({ dir })
    expect(records.map((record) => record.id)).toEqual([first.id, second.id])
  })

  it("returns an empty list when storage file does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "anchor-checkins-"))
    tempDirs.push(dir)

    await expect(listCheckIns({ dir })).resolves.toEqual([])
  })
})

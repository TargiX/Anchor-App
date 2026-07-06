import { mkdir, readFile, appendFile } from "node:fs/promises"
import { AnchorCheckInSchema, type AnchorCheckIn } from "./checkin"

export type CheckInStorageOptions = {
  dir?: string
  filename?: string
}

const DEFAULT_STORAGE_DIR = "data/anchor-checkins"

function storagePath(options: CheckInStorageOptions = {}): string {
  const dir = options.dir ?? DEFAULT_STORAGE_DIR
  return `${dir.replace(/\/$/, "")}/${options.filename ?? "checkins.jsonl"}`
}

async function ensureStorageDir(options: CheckInStorageOptions = {}): Promise<void> {
  const dir = options.dir ?? DEFAULT_STORAGE_DIR
  await mkdir(dir, { recursive: true })
}

export async function appendCheckIn(
  checkIn: AnchorCheckIn,
  options: CheckInStorageOptions = {}
): Promise<void> {
  await ensureStorageDir(options)
  const parsed = AnchorCheckInSchema.parse(checkIn)
  await appendFile(storagePath(options), `${JSON.stringify(parsed)}\n`, "utf8")
}

export async function listCheckIns(
  options: CheckInStorageOptions = {}
): Promise<AnchorCheckIn[]> {
  let content = ""
  try {
    content = await readFile(storagePath(options), "utf8")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return []
    }
    throw error
  }

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => AnchorCheckInSchema.parse(JSON.parse(line)))
    .sort((a, b) => a.ts.localeCompare(b.ts))
}

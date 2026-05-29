import { getTodayKey } from "./today"

export function getDailyIndex(length: number, salt: string, date = new Date()) {
  if (length <= 0) return 0

  const key = `${getTodayKey(date)}:${salt}`
  let hash = 0

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }

  return Math.abs(hash) % length
}

export function pickDailyItems<T>(
  items: T[],
  count: number,
  salt: string,
  date = new Date()
) {
  if (items.length === 0 || count <= 0) return []

  const start = getDailyIndex(items.length, salt, date)
  const size = Math.min(count, items.length)

  return Array.from(
    { length: size },
    (_, i) => items[(start + i) % items.length]
  )
}

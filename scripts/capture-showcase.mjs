// Capture crisp, demo-seeded app screenshots for the landing "product in a
// phone" showcase. Uses the system Chrome via puppeteer-core (no browser
// download). Run against a live dev/prod server:
//
//   npm run dev            # in one terminal (serves :3088)
//   npm run showcase:capture
//
// Output: public/showcase/{dashboard,ritual,timeline}.png
//
// The seed writes a two-week streak into the anon localStorage slot so the
// screens look lived-in instead of empty. It never touches real user data —
// it only runs in this throwaway browser context.

import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const BASE = process.env.SHOWCASE_URL ?? "http://localhost:3088"
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, "../public/showcase")

// Reduced-motion + force framer elements to their settled state so a single
// shot never lands mid-entrance-animation.
const SETTLE_CSS = `*{animation-duration:0s !important;transition:none !important}
[style*="opacity"]{opacity:1 !important;transform:none !important;filter:none !important}
nextjs-portal,[data-next-badge-root],[data-nextjs-toast],#__next-build-watcher{display:none !important}`

function buildSeed() {
  const pad = (n) => String(n).padStart(2, "0")
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = new Date()
  const quals = ["good", "great", "okay", "good", "great", "good", "okay", "great", "good", "good", "great", "okay", "good", "great"]
  const intentions = [
    "Move through the day without rushing",
    "Be fully present with the people I love",
    "Take one meaningful step forward",
    "Let go of what I can’t control",
    "Notice small moments of beauty",
    "Bring more ease to my work",
    "Stay patient with myself",
  ]
  const journals = [
    "A slow, kind evening. Grateful for the quiet.",
    "Long day but I stayed steady. Proud of that.",
    "Made time to walk. It helped more than I expected.",
    "Tired, but the ritual grounded me.",
    "Good conversations today. Feeling connected.",
  ]
  const habits = ["Move", "Read", "Water", "No screens"]
  const entries = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = key(d)
    const t = (13 - i) / 13
    const energy = Math.min(0.95, Math.max(0.25, 0.45 + 0.4 * Math.sin(i / 2) + 0.15 * t))
    const valence = Math.min(0.95, Math.max(0.3, 0.5 + 0.35 * Math.cos(i / 3) + 0.15 * t))
    entries[k] = {
      date: k,
      morningMood: { energy: +energy.toFixed(2), valence: +valence.toFixed(2) },
      eveningMood: { energy: +(energy * 0.85).toFixed(2), valence: +Math.min(0.95, valence + 0.08).toFixed(2) },
      sleepQuality: quals[i],
      sleepHours: 6.5 + ((i * 0.5) % 2.5),
      intention: intentions[i % intentions.length],
      journal: journals[i % journals.length],
      affirmation: "Your presence is the gift. Everything else follows.",
      habitsCompleted: habits.slice(0, 2 + (i % 3)),
      meditationMinutes: 5 + (i % 3) * 5,
    }
  }
  return JSON.stringify({ version: 1, data: { entries } })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  })
  const page = await browser.newPage()
  const seed = buildSeed()

  // Seed the anon slot before the app boots.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" })
  await page.evaluate((value) => localStorage.setItem("anchor-state-anon", value), seed)

  const shots = [
    { name: "dashboard", path: "/app" },
    { name: "ritual", path: "/morning", advance: true },
    { name: "timeline", path: "/timeline" },
  ]

  for (const shot of shots) {
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle0" })
    if (shot.advance) {
      // Step past the affirmation intro into the sleep step (ceremonial header).
      await page
        .evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) =>
            /begin the ritual/i.test(x.textContent)
          )
          b?.click()
        })
        .catch(() => {})
      await new Promise((r) => setTimeout(r, 1200))
    }
    await page.addStyleTag({ content: SETTLE_CSS })
    await new Promise((r) => setTimeout(r, 250))
    await page.screenshot({ path: resolve(OUT_DIR, `${shot.name}.png`) })
    console.log(`captured ${shot.name}.png`)
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

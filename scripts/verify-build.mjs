import assert from "node:assert/strict"
import { readFile, access } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const serverRoutes = [
  "/api/anchor-checkins/route",
  "/api/cron/supabase-keepalive/route",
  "/(protected)/voice-checkin/page",
]

/** Verify the generated routing manifest, not just the configuration intent. */
export function assertBuildRoutes(manifest, target) {
  assert.ok(
    target === "web" || target === "native",
    "Expected web or native target"
  )
  assert.ok(manifest["/(app)/app/page"], "Missing main check-in screen")
  assert.ok(manifest["/(app)/timeline/page"], "Missing history screen")
  assert.ok(manifest["/(app)/review/page"], "Missing weekly review screen")
  for (const route of serverRoutes) {
    assert.equal(
      Boolean(manifest[route]),
      target === "web",
      `Unexpected ${target} route: ${route}`
    )
  }
  if (target === "native") {
    assert.ok(
      !Object.keys(manifest).some((route) => route.startsWith("/api/")),
      "Native bundle includes an API route"
    )
  }
}

async function verify(target) {
  const manifest = JSON.parse(
    await readFile(".next/server/app-paths-manifest.json", "utf8")
  )
  assertBuildRoutes(manifest, target)
  if (target === "native") {
    await access("out/app/index.html")
    await access("out/timeline/index.html")
    await access("out/review/index.html")
    for (const path of ["out/api", "out/voice-checkin"]) {
      await assert.rejects(
        access(path),
        { code: "ENOENT" },
        `Unexpected export: ${path}`
      )
    }
  }
  console.log(`${target} build contract verified`)
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await verify(process.argv[2])
}

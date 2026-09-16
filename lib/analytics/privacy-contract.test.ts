import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8")

describe("analytics privacy and delivery contracts", () => {
  it("keeps browser interaction autocapture disabled", () => {
    const source = readSource("instrumentation-client.ts")

    expect(source).toContain("autocapture: false")
  })

  it("does not send the selected pulse response", () => {
    const source = readSource("components/pulse/pulse-check.tsx")

    expect(source).not.toMatch(
      /captureEvent\("pulse_check_in_saved",\s*\{[\s\S]*?\bresponse:/
    )
  })

  it("awaits voice check-in delivery before returning", () => {
    const source = readSource("app/api/anchor-checkins/route.server.ts")

    expect(source).toContain("await analytics?.captureImmediate({")
    expect(source).not.toContain("analytics?.capture({")
  })
})

import { describe, expect, it } from "vitest"
import { assertBuildRoutes } from "../../scripts/verify-build.mjs"

const nativeRoutes = {
  "/(app)/app/page": "app/(app)/app/page.js",
  "/(app)/timeline/page": "app/(app)/timeline/page.js",
}
const webRoutes = {
  ...nativeRoutes,
  "/api/anchor-checkins/route": "app/api/anchor-checkins/route.js",
  "/api/cron/supabase-keepalive/route":
    "app/api/cron/supabase-keepalive/route.js",
  "/(protected)/voice-checkin/page": "app/(protected)/voice-checkin/page.js",
}

describe("generated build route contract", () => {
  it("accepts separate native and web route sets", () => {
    expect(() => assertBuildRoutes(nativeRoutes, "native")).not.toThrow()
    expect(() => assertBuildRoutes(webRoutes, "web")).not.toThrow()
  })
  it("rejects native routes leaking into web configuration and vice versa", () => {
    expect(() => assertBuildRoutes(nativeRoutes, "web")).toThrow()
    expect(() => assertBuildRoutes(webRoutes, "native")).toThrow()
  })
  it("catches new API routes accidentally added to the native export", () => {
    expect(() =>
      assertBuildRoutes(
        { ...nativeRoutes, "/api/new/route": "new.js" },
        "native"
      )
    ).toThrow()
  })
  it("requires the app screens as well as an explicit build target", () => {
    expect(() => assertBuildRoutes({}, "native")).toThrow()
    expect(() => assertBuildRoutes(nativeRoutes, "typo")).toThrow()
  })
})

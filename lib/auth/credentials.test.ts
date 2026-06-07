import { describe, it, expect } from "vitest"
import { validateEmail, validatePassword, PASSWORD_MIN } from "./credentials"

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("a@b.com")).toBeNull()
    expect(validateEmail("  trimmed@example.io  ")).toBeNull()
  })
  it("rejects empty and malformed", () => {
    expect(validateEmail("")).toBe("Enter your email.")
    expect(validateEmail("not-an-email")).toBe("Enter a valid email.")
  })
})

describe("validatePassword", () => {
  it("accepts a password at/above the minimum", () => {
    expect(validatePassword("x".repeat(PASSWORD_MIN))).toBeNull()
  })
  it("rejects too-short passwords", () => {
    expect(validatePassword("x".repeat(PASSWORD_MIN - 1))).toContain("at least")
  })
})

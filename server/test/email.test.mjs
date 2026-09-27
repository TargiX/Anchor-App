import assert from "node:assert/strict"
import { test } from "node:test"
import nodemailer from "nodemailer"
import { readSmtpConfig, sendEmail } from "../dist/email.js"

const message = {
  to: "owner@example.com",
  subject: "Reset your Anchor password",
  text: "https://api.anchorapp.cc/reset-password/private-token",
}

function setSmtpEnv(t) {
  const keys = ["ANCHOR_SMTP_HOST", "ANCHOR_SMTP_USER", "ANCHOR_SMTP_PASSWORD"]
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  process.env.ANCHOR_SMTP_HOST = "mail.phosphene.cc"
  process.env.ANCHOR_SMTP_USER = "no-reply@anchorapp.cc"
  process.env.ANCHOR_SMTP_PASSWORD = "test-password-never-log"
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })
}

test("missing SMTP settings fail instead of silently discarding reset mail", async () => {
  assert.throws(() => readSmtpConfig({}), /not configured/)
  assert.throws(
    () => readSmtpConfig({ ANCHOR_SMTP_HOST: "mail.phosphene.cc", ANCHOR_SMTP_USER: "not-an-address", ANCHOR_SMTP_PASSWORD: "secret" }),
    /not configured/,
  )
})

test("SMTP uses TLS, the dedicated sender, and accepts the reset message", async (t) => {
  setSmtpEnv(t)
  let options
  let sent
  let closed = false
  t.mock.method(nodemailer, "createTransport", (transportOptions) => {
    options = transportOptions
    return {
      sendMail: async (mail) => {
        sent = mail
        return { accepted: [message.to], rejected: [] }
      },
      close: () => { closed = true },
    }
  })

  await sendEmail(message)
  assert.equal(options.host, "mail.phosphene.cc")
  assert.equal(options.port, 465)
  assert.equal(options.secure, true)
  assert.equal(options.tls.rejectUnauthorized, true)
  assert.deepEqual(options.auth, { user: "no-reply@anchorapp.cc", pass: "test-password-never-log" })
  assert.deepEqual(sent.from, { name: "Anchor", address: "no-reply@anchorapp.cc" })
  assert.equal(sent.to, message.to)
  assert.equal(sent.text, message.text)
  assert.equal(sent.disableFileAccess, true)
  assert.equal(sent.disableUrlAccess, true)
  assert.equal(closed, true)
})

test("SMTP failures never expose the reset link or password", async (t) => {
  setSmtpEnv(t)
  let closed = false
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async () => { throw new Error(`${message.text} test-password-never-log`) },
    close: () => { closed = true },
  }))

  await assert.rejects(sendEmail(message), (error) => {
    assert.equal(error.message, "Anchor email delivery failed")
    assert.equal(error.cause, undefined)
    return true
  })
  assert.equal(closed, true)
})

test("a rejected recipient is a delivery failure", async (t) => {
  setSmtpEnv(t)
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async () => ({ accepted: [], rejected: [message.to] }),
    close: () => {},
  }))
  await assert.rejects(sendEmail(message), /delivery failed/)
})

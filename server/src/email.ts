import { z } from "zod"

export const EmailMessageSchema = z.object({
  to: z.email(),
  subject: z.string(),
  text: z.string(),
})

type EmailMessage = z.infer<typeof EmailMessageSchema>

/**
 * Transactional email via Resend. Without RESEND_API_KEY delivery is skipped —
 * reset links are credentials and must never be written to logs.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  if (!apiKey || !from) {
    console.log("[email:not-configured] delivery skipped")
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`)
  }
}

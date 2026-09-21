/**
 * Transactional email via Resend. Without RESEND_API_KEY the message is logged
 * instead of sent — that keeps local dev and CI honest without a mail account,
 * and the reset URL stays reachable in server logs.
 */
export async function sendEmail(message: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  if (!apiKey || !from) {
    console.log(
      `[email:not-configured] to=${message.to} subject=${message.subject}\n${message.text}`
    )
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

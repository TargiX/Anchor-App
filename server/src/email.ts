import nodemailer from "nodemailer"
import { z } from "zod"

export const EmailMessageSchema = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
})

type EmailMessage = z.infer<typeof EmailMessageSchema>

export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env) {
  const host = env.ANCHOR_SMTP_HOST?.trim()
  const user = env.ANCHOR_SMTP_USER?.trim()
  const password = env.ANCHOR_SMTP_PASSWORD

  if (!host || !user || !password || !z.email().safeParse(user).success) {
    throw new Error("Anchor SMTP is not configured")
  }

  return { host, user, password }
}

/** The mail server exposes authenticated submission on port 465 with TLS. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const parsed = EmailMessageSchema.parse(message)
  const { host, user, password } = readSmtpConfig()
  const transport = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user, pass: password },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  })

  try {
    const result = await transport.sendMail({
      from: { name: "Anchor", address: user },
      to: parsed.to,
      subject: parsed.subject,
      text: parsed.text,
      disableFileAccess: true,
      disableUrlAccess: true,
    })

    if (result.rejected.length > 0 || !result.accepted.includes(parsed.to)) {
      throw new Error("Recipient was not accepted")
    }
  } catch {
    // The reset link is a credential. Do not surface provider error details.
    throw new Error("Anchor email delivery failed")
  } finally {
    transport.close()
  }
}

import { betterAuth } from "better-auth"
import { bearer } from "better-auth/plugins"
import pg from "pg"
import { sendEmail } from "./email.js"

/**
 * The surface the HTTP layer consumes: the fetch-style handler mounted at
 * /api/auth/* and session resolution for data routes. Declared explicitly
 * because better-auth's `Auth` type is invariant over its options generic.
 */
export interface AnchorAuth {
  handler: (request: Request) => Promise<Response>
  api: {
    getSession: (args: {
      headers: Headers
    }) => Promise<{ user: { id: string } } | null>
  }
}

/**
 * Better Auth instance backed by the shared Postgres. Email+password only for
 * v1; the bearer plugin lets Capacitor clients authenticate with
 * `Authorization: Bearer <token>` instead of cookies (which do not reliably
 * survive inside a native WebView).
 */

export function createAuth(pool: pg.Pool): AnchorAuth {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters")
  }

  const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return betterAuth({
    database: pool,
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // The link better-auth builds points at this backend's
      // /api/auth/reset-password/:token callback, which verifies the token and
      // redirects to the frontend's callbackURL (?token= or ?error=).
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your Anchor password",
          text: `Reset your Anchor password:\n\n${url}\n\nIf you didn't ask for this, ignore this email.`,
        })
      },
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      deleteUser: { enabled: true },
    },
    plugins: [bearer()],
  })
}

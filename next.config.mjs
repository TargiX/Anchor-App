import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const isNativeBuild = process.env.BUILD_TARGET === "native"

const nextConfig = {
  // Static export when bundling the app inside Capacitor / Electron.
  // Vercel continues to use the default server build.
  ...(isNativeBuild && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
  }),
}

// Sentry build wrapper. Source-map upload only runs when SENTRY_AUTH_TOKEN is
// set (CI); local builds and forks without Sentry configured are unaffected.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
})

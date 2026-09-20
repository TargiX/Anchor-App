/** @type {import('next').NextConfig} */
const isNativeBuild = process.env.BUILD_TARGET === "native"

// Local dev proxies auth/data calls to the self-hosted backend (default
// http://localhost:3000). Production uses the same paths via vercel.json
// rewrites to https://api.anchorapp.cc.
const devBackendUrl = process.env.BACKEND_URL ?? "http://localhost:3000"

const nextConfig = {
  env: { NEXT_PUBLIC_NATIVE_BUILD: isNativeBuild ? "true" : "false" },
  // Runtime handlers use route.server.ts and are absent from the native bundle.
  // Put the compound extension first so its full suffix is removed from routes.
  pageExtensions: [
    ...(isNativeBuild ? [] : ["server.ts", "server.tsx"]),
    "tsx",
    "ts",
    "jsx",
    "js",
  ],
  // Static export when bundling the app inside Capacitor / Electron.
  // Vercel continues to use the default server build.
  ...(isNativeBuild && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
  }),

  // Dev-only same-origin proxy to the local backend. Production uses the
  // vercel.json rewrites; native builds (static export, no server) call
  // NEXT_PUBLIC_BACKEND_URL directly.
  ...(!isNativeBuild &&
    process.env.NODE_ENV === "development" && {
    async rewrites() {
      return [
        {
          source: "/api/auth/:path*",
          destination: `${devBackendUrl}/api/auth/:path*`,
        },
        {
          source: "/api/data/:path*",
          destination: `${devBackendUrl}/api/data/:path*`,
        },
      ]
    },
  }),
}

export default nextConfig

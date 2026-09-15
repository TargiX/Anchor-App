/** @type {import('next').NextConfig} */
const isNativeBuild = process.env.BUILD_TARGET === "native"

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
}

export default nextConfig

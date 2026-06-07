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

export default nextConfig

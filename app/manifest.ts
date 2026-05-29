import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anchor",
    short_name: "Anchor",
    description:
      "A quiet, local-first space for morning and evening grounding rituals.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f3ec",
    theme_color: "#f8f3ec",
    categories: ["health", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "1170x2532",
        type: "image/png",
        form_factor: "narrow",
        label: "Anchor daily ritual home",
      },
    ],
  }
}

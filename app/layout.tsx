import type { Metadata, Viewport } from "next"
import { Lora, DM_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ReminderScheduler } from "@/components/reminder-scheduler"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { cn } from "@/lib/utils"

const display = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
})

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  applicationName: "Anchor",
  title: "Anchor — Your Daily Grounding Ritual",
  description:
    "A quiet, beautiful space for your morning and evening rituals. Mood, sleep, journaling, and meditation in one unified flow.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anchor",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#2e2519" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "bg-background antialiased",
        display.variable,
        body.variable
      )}
    >
      <body className="font-sans">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ReminderScheduler />
            <ServiceWorkerRegistrar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

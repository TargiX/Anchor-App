import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Cormorant_Garamond, DM_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ReminderScheduler } from "@/components/reminder-scheduler"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"
import { SyncProvider } from "@/components/sync-provider"
import { JournalEditingProvider } from "@/components/journal-note"
import { DeviceStorageProvider } from "@/components/device-storage-provider"
import { cn } from "@/lib/utils"

const display = Cormorant_Garamond({
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
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e332f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body
        className={cn(
          "font-sans",
          process.env.NEXT_PUBLIC_NATIVE_BUILD === "true" && "native-app"
        )}
      >
        <Script src="/traffic.js" strategy="afterInteractive" />
        <ThemeProvider>
          <DeviceStorageProvider>
            <AuthProvider>
              <SyncProvider />
              <JournalEditingProvider>{children}</JournalEditingProvider>
              <ReminderScheduler />
              <ServiceWorkerRegistrar />
            </AuthProvider>
          </DeviceStorageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

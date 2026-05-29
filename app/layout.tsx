import type { Metadata, Viewport } from "next"
import { Lora, DM_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ReminderScheduler } from "@/components/reminder-scheduler"
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
  title: "Anchor — Your Daily Grounding Ritual",
  description:
    "A quiet, beautiful space for your morning and evening rituals. Mood, sleep, journaling, and meditation in one unified flow.",
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
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

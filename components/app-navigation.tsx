"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, CalendarDays, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppNavigation() {
  const pathname = usePathname()
  // Rituals keep their own next/back controls and return to Today on completion.
  if (!["/app", "/timeline", "/review"].includes(pathname.replace(/\/$/, "")))
    return null
  return (
    <nav
      aria-label="Your Anchor"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2 px-4 pt-2">
        {[
          { href: "/app", label: "Today", icon: Sun },
          { href: "/timeline", label: "Journal", icon: BookOpen },
          { href: "/review", label: "Review", icon: CalendarDays },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname.replace(/\/$/, "") === href ? "page" : undefined
            }
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs focus-visible:outline-2 focus-visible:outline-ring",
              pathname.replace(/\/$/, "") === href
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

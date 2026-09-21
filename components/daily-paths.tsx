import Link from "next/link"
import type { DayEntry } from "@/lib/domain/entry"

export function DailyPaths({ entry }: { entry: DayEntry }) {
  const paths = [
    {
      href: "/morning",
      label: "Morning",
      done: Boolean(entry.morningMood && entry.intention),
    },
    { href: "/focus", label: "Pause", done: false },
    {
      href: "/evening",
      label: "Evening",
      done: Boolean(entry.eveningMood && entry.journal),
    },
  ]
  return (
    <nav
      aria-label="Make space for your day"
      className="mt-12 mb-6 flex items-center justify-center gap-1 border-t border-border/60 pt-5 text-sm"
    >
      {paths.map(({ href, label, done }, index) => (
        <span key={href} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden className="mx-3 text-muted-foreground/50">
              ·
            </span>
          )}
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {label}
            {done && (
              <span className="text-xs text-muted-foreground/60">done</span>
            )}
          </Link>
        </span>
      ))}
    </nav>
  )
}

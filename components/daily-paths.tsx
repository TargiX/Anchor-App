import Link from "next/link"
import type { DayEntry } from "@/lib/domain/entry"

export function DailyPaths({ entry }: { entry: DayEntry }) {
  return (
    <section
      aria-label="Make space for your day"
      className="mt-10 mb-6 grid grid-cols-3 gap-2"
    >
      {[
        {
          href: "/morning",
          title: "Begin",
          detail: entry.morningMood && entry.intention ? "Revisit" : "Morning",
        },
        {
          href: "/focus",
          title: "Pause",
          detail: "Breathe",
        },
        {
          href: "/evening",
          title: "Reflect",
          detail: entry.eveningMood && entry.journal ? "Revisit" : "Evening",
        },
      ].map(({ href, title, detail }) => (
        <Link
          key={href}
          href={href}
          className="rounded-xl py-3 text-center transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {detail}
          </span>
        </Link>
      ))}
    </section>
  )
}

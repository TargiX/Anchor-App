import Link from "next/link"
import { Moon, Sunrise, Wind } from "lucide-react"
import type { DayEntry } from "@/lib/domain/entry"

export function DailyPaths({ entry }: { entry: DayEntry }) {
  return (
    <section
      aria-label="Make space for your day"
      className="mb-8 grid grid-cols-3 gap-2 border-y border-border py-5"
    >
      {[
        {
          href: "/morning",
          icon: Sunrise,
          title: "Begin",
          detail:
            entry.morningMood && entry.intention
              ? "Revisit your morning"
              : "Choose what matters",
        },
        {
          href: "/focus",
          icon: Wind,
          title: "Pause",
          detail: "A little breathing room",
        },
        {
          href: "/evening",
          icon: Moon,
          title: "Reflect",
          detail:
            entry.eveningMood && entry.journal
              ? "Revisit your evening"
              : "Gather the day",
        },
      ].map(({ href, icon: Icon, title, detail }) => (
        <Link
          key={href}
          href={href}
          className="rounded-xl px-2 py-3 text-center transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon className="mx-auto mb-3 size-6 text-accent" strokeWidth={1.5} />
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {detail}
          </span>
        </Link>
      ))}
    </section>
  )
}

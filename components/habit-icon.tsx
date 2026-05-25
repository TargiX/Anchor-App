import { Footprints, Droplets, BookOpen, Moon, Circle, type LucideProps } from "lucide-react"

/**
 * Maps a habit's stable `icon` string (stored in the domain) to a Lucide
 * component. Keeping this in the UI layer lets the domain stay serialisable
 * and icon-library-agnostic. Unknown keys fall back to a neutral circle.
 */
const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  footprints: Footprints,
  droplets: Droplets,
  "book-open": BookOpen,
  moon: Moon,
  circle: Circle,
}

export function HabitIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Icon = ICONS[icon] ?? Circle
  return <Icon {...props} />
}

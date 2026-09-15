import { AppNavigation } from "@/components/app-navigation"

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="pb-28">
      {children}
      <AppNavigation />
    </div>
  )
}

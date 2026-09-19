import { AppChrome } from "@/components/app-navigation"

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppChrome>{children}</AppChrome>
}

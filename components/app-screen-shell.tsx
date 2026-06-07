import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AppScreenShellProps {
  children: React.ReactNode
  title: string
  eyebrow?: string
  description?: string
  backHref?: string
  backLabel?: string
  railTitle?: string
  railBody?: string
  railMeta?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function AppScreenShell({
  children,
  title,
  eyebrow = "Anchor",
  description,
  backHref,
  backLabel = "Back",
  railTitle,
  railBody,
  railMeta,
  className,
  contentClassName,
}: AppScreenShellProps) {
  return (
    <main className={cn("min-h-dvh px-6 py-8 lg:px-10 lg:py-10", className)}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col lg:grid lg:max-w-6xl lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/70 pr-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <AnchorMotif size={188} className="-ml-6 text-primary opacity-75" />
            <p className="mt-8 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold text-balance text-foreground">
              {railTitle ?? title}
            </h1>
            {(railBody ?? description) ? (
              <p className="mt-5 max-w-[260px] text-sm leading-7 text-muted-foreground">
                {railBody ?? description}
              </p>
            ) : null}
          </div>
          {railMeta ? <div className="pb-3">{railMeta}</div> : null}
        </aside>

        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl",
            contentClassName
          )}
        >
          <header className="flex items-center gap-3 pb-6 lg:pb-8">
            {backHref ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="-ml-2 rounded-xl"
              >
                <Link href={backHref} aria-label={backLabel}>
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
            ) : null}
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase lg:hidden">
                {eyebrow}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-medium text-foreground lg:text-3xl lg:font-semibold">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-muted-foreground lg:block">
                  {description}
                </p>
              ) : null}
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  )
}

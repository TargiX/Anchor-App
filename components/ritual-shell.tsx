"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AnchorMotif } from "@/components/anchor-motif"
import { cn } from "@/lib/utils"

interface RitualShellProps {
  children: React.ReactNode
  step: number
  totalSteps: number
  title?: string
  description?: string
  className?: string
}

const variants = {
  enter: {
    opacity: 0,
    y: 24,
    scale: 0.98,
  },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.98,
  },
}

export function RitualShell({
  children,
  step,
  totalSteps,
  title = "Daily ritual",
  description = "Move through one quiet step at a time.",
  className,
}: RitualShellProps) {
  const stepLabel = `${Math.min(step + 1, totalSteps)} of ${totalSteps}`

  return (
    <div className={cn("min-h-dvh px-6 lg:px-10 lg:py-10", className)}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col lg:grid lg:min-h-[calc(100dvh-5rem)] lg:max-w-6xl lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch lg:gap-12 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/70 pr-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <AnchorMotif size={220} className="-ml-8 text-primary opacity-75" />
            <p className="mt-8 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {stepLabel}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold text-balance text-foreground">
              {title}
            </h1>
            <p className="mt-5 max-w-[280px] text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
          <p className="pb-3 font-[family-name:var(--font-display)] text-sm leading-7 text-muted-foreground italic">
            Anchor is local-first. Your ritual stays with you.
          </p>
        </aside>

        <main className="flex min-h-dvh flex-col lg:min-h-0">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-8 pb-6 lg:pt-3 lg:pb-7">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 lg:h-2",
                  i < step
                    ? "w-5 bg-primary lg:w-8"
                    : i === step
                      ? "w-7 bg-accent lg:w-12"
                      : "w-3 bg-border lg:w-5"
                )}
              />
            ))}
          </div>

          {/* Animated step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex flex-1 flex-col lg:min-h-[640px] lg:rounded-[2rem] lg:border lg:border-border/80 lg:bg-card/55 lg:px-10 lg:py-8 lg:shadow-sm"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

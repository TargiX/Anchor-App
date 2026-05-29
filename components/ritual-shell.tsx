"use client"

import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface RitualShellProps {
  children: React.ReactNode
  step: number
  totalSteps: number
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
  className,
}: RitualShellProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-safe",
        className
      )}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i < step
                ? "w-5 bg-primary"
                : i === step
                  ? "w-7 bg-accent"
                  : "w-3 bg-border"
            )}
          />
        ))}
      </div>

      {/* Animated step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={shouldReduceMotion ? undefined : variants}
          initial={shouldReduceMotion ? false : "enter"}
          animate={shouldReduceMotion ? { opacity: 1 } : "center"}
          exit={shouldReduceMotion ? { opacity: 1 } : "exit"}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

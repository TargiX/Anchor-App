"use client"

import { motion, AnimatePresence } from "framer-motion"
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

export function RitualShell({ children, step, totalSteps, className }: RitualShellProps) {
  return (
    <div className={cn("flex flex-col min-h-dvh max-w-md mx-auto px-6", className)}>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i < step
                ? "bg-primary w-5"
                : i === step
                ? "bg-accent w-7"
                : "bg-border w-3"
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
          className="flex flex-col flex-1"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

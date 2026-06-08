"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sunrise,
  Moon,
  LineChart,
  Sparkles,
  Smartphone,
  Monitor,
  Globe,
} from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Sunrise,
    title: "Morning ritual",
    body: "Set an intention, log mood and sleep, breathe. A quiet five minutes that anchors the day.",
  },
  {
    icon: Moon,
    title: "Evening ritual",
    body: "Reflect, journal, prepare tomorrow's sleep window. Close the loop before bed.",
  },
  {
    icon: LineChart,
    title: "Timeline",
    body: "Mood, sleep and habit streaks visualised over time. Trends, not just snapshots.",
  },
]

const platforms = [
  { icon: Globe, label: "Web", note: "Available" },
  { icon: Smartphone, label: "iOS / Android", note: "Capacitor-ready" },
  { icon: Monitor, label: "macOS / Windows", note: "Electron-ready" },
]

const stack = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind v4",
  "Radix UI",
  "Framer Motion",
  "Capacitor",
  "Electron",
]

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,oklch(0.65_0.085_47/0.18),transparent_70%),radial-gradient(45%_40%_at_85%_30%,oklch(0.38_0.065_52/0.12),transparent_75%)]"
      />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <AnchorMotif size={32} className="text-primary" />
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Anchor
          </span>
        </Link>
        <nav className="hidden gap-7 text-sm text-muted-foreground sm:flex">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#platforms"
            className="transition-colors hover:text-foreground"
          >
            Platforms
          </a>
          <a href="#stack" className="transition-colors hover:text-foreground">
            Stack
          </a>
        </nav>
        <Link href="/app">
          <Button size="sm" className="rounded-xl">
            Open app
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-12 pb-20 text-center sm:pt-20 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-8"
        >
          <AnchorMotif size={140} className="text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs tracking-widest text-muted-foreground uppercase backdrop-blur"
        >
          <Sparkles className="size-3 text-accent" />A quiet daily ritual
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
        >
          Begin and close the day,
          <br />
          <span className="text-primary italic">on purpose.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
        >
          Anchor is a small, quiet space for morning and evening rituals — mood,
          sleep, intention, journal. Web, mobile, and desktop. One unified flow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link href="/app">
            <Button
              size="lg"
              className="h-12 rounded-2xl px-7 text-base font-medium"
            >
              Try it now
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </Link>
          <a href="#features">
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl px-7 text-base font-medium"
            >
              See how it works
            </Button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 text-xs text-muted-foreground"
        >
          Account-backed journal sync · private by default · installable on the web
        </motion.p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="mb-10 max-w-xl">
          <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            What&apos;s inside
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            Two short rituals.
            <br />
            One long trend line.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-3xl border border-border bg-card/60 p-6 backdrop-blur transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:scale-105">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-medium">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
                Anywhere
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                One codebase.
                <br />
                Web, mobile, desktop.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
                Built once with Next.js, then wrapped natively with Capacitor
                for iOS & Android and Electron for macOS &amp; Windows. Same UI,
                same flow, everywhere you check in.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {platforms.map((p, i) => (
                <motion.div
                  key={p.label}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background/60 px-5 py-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <p.icon className="size-5" />
                  </div>
                  <span className="font-medium">{p.label}</span>
                  <span className="ml-auto text-xs tracking-widest text-muted-foreground uppercase">
                    {p.note}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            Built with
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-balance sm:text-3xl">
            A modern, production-grade stack
          </h2>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {stack.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-br from-card to-card/60 p-10 text-center sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_60%_at_50%_0%,oklch(0.65_0.085_47/0.22),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Five quiet minutes.
              <br />
              Twice a day.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
              That&apos;s it. Start tonight.
            </p>
            <Link href="/app">
              <Button
                size="lg"
                className="mt-8 h-12 rounded-2xl px-8 text-base font-medium"
              >
                Open Anchor
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <AnchorMotif size={20} className="text-primary" />
            <span>Anchor · A daily ritual app</span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/app"
              className="transition-colors hover:text-foreground"
            >
              Open app
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/support"
              className="transition-colors hover:text-foreground"
            >
              Support
            </Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

import Link from "next/link"
import {
  ArrowRight,
  Globe2,
  LineChart,
  Monitor,
  Moon,
  Smartphone,
  Sunrise,
} from "lucide-react"

import { LandingHeroVideo } from "@/components/landing-hero-video"
import { LandingMotion } from "@/components/landing-motion"

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
    body: "Mood, sleep and habit streaks visualized over time. Trends, not just snapshots.",
  },
]

const platforms = [
  { icon: Globe2, label: "In your browser", note: "Just open it" },
  { icon: Smartphone, label: "On your phone", note: "Add to home" },
  { icon: Monitor, label: "On your desktop", note: "Install it" },
]

const practice = [
  "Intention",
  "Mood",
  "Sleep",
  "Breath",
  "Gratitude",
  "Reflection",
  "Affirmation",
  "Calm",
  "Rest",
  "Clarity",
  "Focus",
  "Presence",
]

export default function Landing() {
  return (
    <main className="landing-page">
      <LandingMotion />
      <header className="landing-header">
        <Link href="/" className="landing-logo" aria-label="Anchor home">
          Anchor
        </Link>
        <nav className="landing-nav" aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#practice">Practice</a>
          <a href="#about">About</a>
        </nav>
        <Link href="/app" className="landing-button landing-button--primary">
          <span>Open app</span>
          <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
        </Link>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <LandingHeroVideo />
        <div className="landing-grid landing-hero__grid">
          <div className="landing-hero__copy">
            <p className="landing-kicker">A quiet daily ritual</p>
            <h1
              id="landing-title"
              className="landing-display landing-hero__title"
            >
              Begin and close
              <br />
              the day,
              <br />
              <em>on purpose.</em>
            </h1>
            <p className="landing-body landing-hero__body">
              Anchor is a small, quiet space for morning and evening rituals
              &mdash; mood, sleep, intention, journal. One unified flow.
            </p>
            <div className="landing-actions" aria-label="Primary actions">
              <Link href="/app" className="landing-button landing-button--primary">
                <span>Try it now</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
              </Link>
              <a href="#features" className="landing-button landing-button--ghost">
                See how it works
              </a>
            </div>
            <p className="landing-proof">
              Account-backed journal sync &middot; Private by default &middot;
              Available on the web
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features">
        <div className="landing-grid landing-features__grid">
          <div className="landing-section-intro">
            <p className="landing-kicker">What&apos;s inside</p>
            <h2 className="landing-display">
              Two short rituals.
              <br />
              One long trend line.
            </h2>
          </div>

          <div className="landing-feature-list">
            {features.map((feature) => (
              <article className="landing-card" key={feature.title}>
                <span className="landing-icon" aria-hidden="true">
                  <feature.icon size={30} strokeWidth={1.45} />
                </span>
                <h3 className="landing-display">{feature.title}</h3>
                <p>{feature.body}</p>
                <ArrowRight
                  className="landing-card__arrow"
                  aria-hidden="true"
                  size={22}
                  strokeWidth={1.35}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-platforms" aria-labelledby="platforms-title">
        <div className="landing-platforms__image" aria-hidden="true" />

        <div className="landing-grid landing-platforms__grid">
          <div className="landing-section-intro">
            <p className="landing-kicker">Anywhere</p>
            <h2 id="platforms-title" className="landing-display">
              Wherever
              <br />
              you check in.
            </h2>
            <p className="landing-body">
              Open Anchor in your browser, or add it to your home screen on
              phone and desktop. No app store, no download &mdash; it&apos;s
              just there when you need it.
            </p>
          </div>

          <div className="landing-platform-list">
            {platforms.map((platform) => (
              <div className="landing-platform-row" key={platform.label}>
                <span className="landing-platform-row__icon" aria-hidden="true">
                  <platform.icon size={24} strokeWidth={1.5} />
                </span>
                <span>{platform.label}</span>
                <small>{platform.note}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="practice" className="landing-practice">
        <div className="landing-grid">
          <div className="landing-practice__intro">
            <p className="landing-kicker">The practice</p>
            <h2 className="landing-display">
              A gentle vocabulary for your day
            </h2>
          </div>

          <div className="landing-chip-list" aria-label="Practice vocabulary">
            {practice.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </div>

          <section
            id="about"
            className="landing-closing"
            aria-labelledby="closing-title"
          >
            <div className="landing-closing__copy">
              <h2 id="closing-title" className="landing-display">
                Five quiet minutes.
                <br />
                Twice a day.
              </h2>
              <p>That&apos;s it. Start tonight.</p>
              <Link href="/app" className="landing-button landing-button--primary">
                <span>Open Anchor</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
              </Link>
            </div>
          </section>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-grid landing-footer__inner">
          <p>Anchor &middot; A daily ritual app</p>
          <nav aria-label="Footer navigation">
            <Link href="/app">Open app</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/support">Support</Link>
            <span>© 2025</span>
          </nav>
        </div>
      </footer>
    </main>
  )
}

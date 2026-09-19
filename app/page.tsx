import Link from "next/link"
import {
  ArrowRight,
  Globe2,
  LineChart,
  Moon,
  Smartphone,
  Sunrise,
} from "lucide-react"

import { LandingHeroVideo } from "@/components/landing-hero-video"
import { LandingMotion } from "@/components/landing-motion"
import { LandingShowcase } from "@/components/landing-showcase"

const features = [
  {
    icon: Sunrise,
    title: "Today",
    body: "Write what you want to keep. A photo, a next step, or just the day as it was.",
  },
  {
    icon: Moon,
    title: "Journal",
    body: "Search, favorite, edit, and export. Your days stay on this device.",
  },
  {
    icon: LineChart,
    title: "Review",
    body: "Look at the week in your own words. Carry one small thing forward.",
  },
]

const platforms = [
  { icon: Smartphone, label: "On iPhone", note: "Built for this" },
  { icon: Globe2, label: "In the browser", note: "The same journal" },
]

const practice = [
  "Today",
  "Journal",
  "Review",
  "Note",
  "Photo",
  "Morning",
  "Evening",
  "Breath",
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
          <a href="#practice">Inside</a>
          <a href="#about">About</a>
        </nav>
        <div className="landing-header-actions">
          <Link href="/login" className="landing-button landing-button--ghost">
            Sign in
          </Link>
          <Link href="/app" className="landing-button landing-button--primary">
            <span>Open the journal</span>
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <LandingHeroVideo />
        <div className="landing-grid landing-hero__grid">
          <div className="landing-hero__copy">
            <p className="landing-kicker">A private journal</p>
            <h1
              id="landing-title"
              className="landing-display landing-hero__title"
            >
              Keep your days.
              <br />
              Make room
              <br />
              <em>for what matters.</em>
            </h1>
            <p className="landing-body landing-hero__body">
              Write what happened. Look back when you want. Choose a small next
              step &mdash; without generated advice.
            </p>
            <div className="landing-actions" aria-label="Primary actions">
              <Link
                href="/app"
                className="landing-button landing-button--primary"
              >
                <span>Open the journal</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
              </Link>
              <a
                href="#features"
                className="landing-button landing-button--ghost"
              >
                See how it works
              </a>
            </div>
            <p className="landing-proof">
              Stays on this device &middot; Optional sync &middot; Built for
              iPhone
            </p>
          </div>
        </div>
      </section>

      <LandingShowcase />

      <section id="features" className="landing-section landing-features">
        <div className="landing-grid landing-features__grid">
          <div className="landing-section-intro">
            <p className="landing-kicker">What&apos;s inside</p>
            <h2 className="landing-display">
              A day, a week,
              <br />a next small step.
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
              you write.
            </h2>
            <p className="landing-body">
              On iPhone, or in the browser. Records stay on this device until
              you choose to sync.
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
            <p className="landing-kicker">Inside</p>
            <h2 className="landing-display">Today, Journal, Review.</h2>
          </div>

          <div className="landing-chip-list" aria-label="What is inside Anchor">
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
                Keep a little
                <br />
                of today.
              </h2>
              <p>Start with one note.</p>
              <Link
                href="/app"
                className="landing-button landing-button--primary"
              >
                <span>Open the journal</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
              </Link>
            </div>
          </section>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-grid landing-footer__inner">
          <div className="landing-footer__brand">
            <Link href="/" className="landing-logo" aria-label="Anchor home">
              Anchor
            </Link>
            <p>A private journal for the days you want to keep.</p>
            <Link
              href="/app"
              className="landing-button landing-button--primary"
            >
              <span>Open the journal</span>
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
            </Link>
          </div>

          <nav className="landing-footer__nav" aria-label="Footer navigation">
            <div>
              <span>The journal</span>
              <a href="#features">Features</a>
              <a href="#practice">The day</a>
              <a href="#about">Why Anchor</a>
            </div>
            <div>
              <span>App</span>
              <Link href="/morning">Morning</Link>
              <Link href="/evening">Evening</Link>
              <Link href="/focus">Focus</Link>
              <Link href="/timeline">Journal</Link>
            </div>
            <div>
              <span>Company</span>
              <Link href="/support">Support</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </nav>

          <div className="landing-footer__bottom">
            <span>© 2026 Anchor</span>
            <span>Private by default</span>
            <span>Optional sync</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

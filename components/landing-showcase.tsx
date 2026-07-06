"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

/**
 * "Product in a phone" showcase for the landing. Auto-rotates through a few
 * real, demo-seeded app screens inside a phone frame. Screens are captured by
 * `npm run showcase:capture` into /public/showcase.
 */

const SCREENS = [
  {
    id: "dashboard",
    label: "Today",
    src: "/showcase/dashboard.png",
    caption: "One glance: your streak, both rituals, today's intention.",
  },
  {
    id: "ritual",
    label: "Ritual",
    src: "/showcase/ritual.png",
    caption: "One quiet step at a time — mood, sleep, a moment to breathe.",
  },
  {
    id: "timeline",
    label: "Timeline",
    src: "/showcase/timeline.png",
    caption: "Weeks of mood and sleep, gathered into one gentle history.",
  },
] as const

const ROTATE_MS = 4200

export function LandingShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [locked, setLocked] = useState(false)
  const active = SCREENS[index] ?? SCREENS[0]

  useEffect(() => {
    if (paused || locked) return
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SCREENS.length),
      ROTATE_MS
    )
    return () => clearInterval(id)
  }, [paused, locked])

  const pick = useCallback((i: number) => {
    setLocked(true)
    setIndex(i)
  }, [])

  return (
    <section className="landing-showcase" aria-labelledby="showcase-title">
      <div className="landing-grid landing-showcase__grid">
        <div className="landing-section-intro landing-showcase__intro">
          <p className="landing-kicker">The product</p>
          <h2 id="showcase-title" className="landing-display">
            A ritual you
            <br />
            can actually see.
          </h2>
          <p className="landing-body">
            Not another form to fill in. Anchor turns your mornings and evenings
            into a calm, unified flow &mdash; and quietly keeps the thread across
            weeks.
          </p>

          <div className="landing-showcase__tabs" role="tablist" aria-label="App screens">
            {SCREENS.map((screen, i) => (
              <button
                key={screen.id}
                role="tab"
                aria-selected={i === index}
                className="landing-showcase__tab"
                data-active={i === index ? "" : undefined}
                onClick={() => pick(i)}
              >
                {screen.label}
              </button>
            ))}
          </div>

          <p className="landing-showcase__caption" aria-live="polite">
            {active.caption}
          </p>
        </div>

        <div
          className="landing-showcase__stage"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="landing-showcase__phone">
            <span className="landing-showcase__notch" aria-hidden="true" />
            <div className="landing-showcase__screen">
              {SCREENS.map((screen, i) => (
                <Image
                  key={screen.id}
                  src={screen.src}
                  alt={`Anchor — ${screen.label}`}
                  fill
                  sizes="(max-width: 900px) 80vw, 300px"
                  priority={i === 0}
                  className="landing-showcase__shot"
                  data-active={i === index ? "" : undefined}
                />
              ))}
              <div className="landing-showcase__dots" aria-hidden="true">
                {SCREENS.map((screen, i) => (
                  <span
                    key={screen.id}
                    data-active={i === index ? "" : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

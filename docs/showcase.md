# Anchor — Showcase kit (LinkedIn + portfolio)

Everything you need to present Anchor without an App Store link.

## Where to point people
- **Primary "try it" link:** the live Vercel URL (the web build *is* the product,
  one click, no install). Put this in the **first comment** of the LinkedIn post.
- **Case study:** your portfolio page (already live).
- **Optional distinct link:** deploy Anchor on its own subdomain
  (e.g. `anchor.<your-domain>`) so LinkedIn has a clean branded URL.
- Native (TestFlight / Play internal testing) links are possible later once the
  native builds exist — but the web link is lower-friction for recruiters.

## LinkedIn post (draft — edit the voice to yours)

> I built Anchor — a quiet daily-ritual app that runs as one codebase across
> web, iOS/Android (Capacitor), and desktop (Electron).
>
> The interesting part wasn't the UI, it was making it *real*:
> • Next.js 16 + React 19 + TypeScript, with a typed domain layer (zod schemas
>   as the source of truth) and unit tests on the logic.
> • Offline-first local store with versioned, validated persistence (and a
>   storage seam so the same code runs native).
> • Supabase auth + cross-device sync, graceful when offline.
> • Same UI on a phone and on the desktop — shipped from one repo.
>
> No "AI slop": every screen handles empty/loading/error, and I reviewed and
> fixed the generated code (a whole class of Radix styling bugs, for one).
>
> Try it 👇 (link in comments) · full case study in my portfolio.

First comment: `Live: <vercel-url>  ·  Case study: <portfolio-url>`

### Why this works on LinkedIn
- LinkedIn suppresses outbound links in the post body → link goes in the **first
  comment**, post body carries a **carousel or video**.
- Lead with the **cross-platform** angle — phone + desktop from one codebase is
  the differentiator most front-end posts don't have.

## Asset checklist (capture in workstream WS-6)

Phone-framed screenshots (mobile viewport, e.g. 430×932):
- [ ] Landing `/`
- [ ] Dashboard `/app` (streak + ritual cards)
- [ ] Morning ritual — affirmation
- [ ] Mood grid (`step-mood`)
- [ ] Sleep slider (`step-sleep`)
- [ ] Timeline

Proof of cross-platform:
- [ ] One Electron desktop window screenshot (`npm run desktop:dev`)
- [ ] One iOS/Android simulator screenshot (`npm run mobile:add:ios` then run)

Motion:
- [ ] 15–30s screen recording of one flow: open ritual → mood grid → sleep
      slider → complete → streak updates. Export as MP4 + GIF.

Carousel (for the post):
- [ ] 5–7 slides: hook slide → 4–5 screens → "one codebase, 3 platforms" slide →
      CTA slide with the link. Export as PDF (LinkedIn renders PDF as a carousel).

## Quick capture notes
- Web screenshots: run `npm run build && npm start`, open the URL, set a phone
  viewport, screenshot each route. (Headless tooling already used in dev.)
- Phone frames: drop the raw screenshots into a mockup tool (e.g. Figma frame,
  shots.so, or mockuphone) for the device bezel.

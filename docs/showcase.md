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
> as the source of truth) and unit tests on the logic.
> • Offline-first local store with versioned, validated persistence (and a
> storage seam so the same code runs native).
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

Use this as the capture contract so the portfolio, LinkedIn post, and native beta
screens do not drift into three different stories.

### Required stills

Capture these from the production build unless you are explicitly showing native
chrome. Keep raw screenshots first, then create framed/social variants from the
same source files.

| File | Route / state | Viewport | Why it exists |
| --- | --- | --- | --- |
| `01-landing-mobile.png` | `/` | 430×932 | First impression, brand, and product promise. |
| `02-dashboard-mobile.png` | `/app` with sample streak + ritual cards | 430×932 | Shows the daily habit loop in one screen. |
| `03-morning-mood-mobile.png` | `/morning` mood grid step | 430×932 | Interaction proof + accessibility polish. |
| `04-morning-sleep-mobile.png` | `/morning` sleep slider step | 430×932 | Shows tangible data capture, not generic journaling. |
| `05-timeline-mobile.png` | `/timeline` with sample entries | 430×932 | Shows progress/trends over time. |
| `06-desktop-dashboard.png` | Electron desktop window on `/app` | 1440×900 | Cross-platform proof from the same codebase. |
| `07-native-simulator.png` | iOS/Android simulator dashboard | device default | Native-shell proof once WS-6 runs. |

### Required motion

- `anchor-ritual-flow.mp4` — 15–30s: dashboard → open morning ritual → mood grid
  → sleep slider → complete → streak/dashboard update.
- `anchor-cross-platform.mp4` — optional 10–15s split-screen: web/mobile/desktop
  showing the same visual system. Use only if it looks clean; a bad split-screen
  is worse than no split-screen.

### Carousel outline

LinkedIn renders PDFs as carousels. Keep this to 5–7 slides:

1. Hook: `One Next.js app. Web, mobile, desktop.`
2. Daily loop: dashboard + ritual cards.
3. Interaction proof: mood grid / sleep slider.
4. Data proof: timeline + persistence.
5. Architecture proof: typed domain layer, local-first cache, Supabase sync.
6. Platform proof: Electron + Capacitor.
7. CTA: live app + case study in first comment.

## Capture workflow

1. Install and build once:
   ```bash
   npm ci
   npm run build
   npm start
   ```
2. Open `http://localhost:3000`, set the browser to a 430×932 mobile viewport,
   and capture the five mobile stills from the table above.
3. For desktop proof, run `npm run desktop:dev` and capture the dashboard in the
   Electron shell.
4. For native proof, run `npm run mobile:add:ios` or `npm run mobile:add:android`,
   open the generated project, and capture one simulator screenshot after
   `npm run cap:sync`.
5. Export raw assets first. Only then create framed versions in Figma/shots.so/
   mockuphone so the source images stay reusable for portfolio updates.

## Quality bar

- Use real seeded state or a realistic local profile; no empty dashboards in
  marketing screenshots.
- Hide browser UI except when proving the web/PWA install path.
- Prefer one clean flow recording over multiple half-working clips.
- If native setup fails, ship the web/Electron story and mark simulator capture as
  blocked by local Xcode/Android Studio setup — do not fake the platform proof.

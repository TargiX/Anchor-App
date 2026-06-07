# Anchor — Roadmap & Handoff

Single source of truth for what this app is, what's done, and what's next.
Written so a fresh session (or a parallel agent) can pick up cold.

**Anchor** is a daily-ritual app (morning/evening check-ins: mood, sleep,
intention, journal, meditation, habits) built as a portfolio piece that is
also a *real* app. Web (Vercel) + mobile (Capacitor) + desktop (Electron) from
one Next.js codebase.

---

## How to get oriented (do this first)

1. Read this file + `CLAUDE.md`.
2. Run the gate to confirm a green baseline:
   ```bash
   npm install
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
3. Preview locally: `npm run dev` → http://localhost:3000
   (prod: `npm start`; native static export: `npm run build:native`).

## Architecture (the conventions that must hold)

Layered, typed, testable. Do not put domain logic in components.

```text
lib/
  time/        local-date keys (NOT UTC), time-of-day context. Pure + tested.
  domain/      zod schemas + inferred types (entry, habit), selectors
               (isMorningComplete, computeStreak…), validation. Pure + tested.
  store/       state.ts (AppState schema + migrate), persistence.ts (StoragePort
               — localStorage cache), cloud.ts (Supabase sync), store.ts
               (reactive, useSyncExternalStore), actions.ts (the only mutators).
  notifications/ port.ts (web adapter + Capacitor seam), schedule.ts (pure +
               tested), index.ts (reactive permission).
  supabase/    client.ts (production auth/sync; null only as local dev fallback).
  auth/        credentials.ts (zod validators, tested).
components/    ui/ (shadcn primitives), feature components, providers.
app/           / (landing), /login, (protected)/ group = gated app routes.
```

Rules:
- **Schemas are the source of truth**; types are `z.infer`. Validate at the
  storage boundary, trust types inside.
- **Components never call `setState` directly** — only `lib/store/actions`.
- **No magic numbers** — limits live in `lib/domain/validation` (`LIMITS`).
- **Day keys are local** (`lib/time/today`), never `toISOString()`.
- **Radix data-attrs**: target `data-[orientation=…]` / `data-[state=…]`, never
  the legacy `data-horizontal`/`data-active` (that bug class bit us twice).
- **Graceful degradation**: missing Supabase env may keep local dev usable, but
  production must configure Supabase because journal/progress data is user-owned.
- **No slop**: every screen handles empty/loading/error; no fake/cosmetic
  features; review AI output.

Quality gate (must pass before "done"): `typecheck` clean, `lint` 0 errors,
`test` green, `build` green. Verify user-facing changes in the browser.

---

## Done (this far)

- Landing `/`; dashboard moved to `/app` (clickable ritual cards).
- Capacitor + Electron wired; `BUILD_TARGET=native` → static export (`out/`).
- Fixed systemic Radix `data-*` mismatch (slider, tabs, separator, dialog, sheet).
- **Architecture refactor**: `lib/time`, `lib/domain`, `lib/store` layers.
- **zod + vitest**; 39 tests (time, selectors, migrate, validation, schedule, credentials).
- **Resilience**: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- **Input validation** wired (intention/journal limits, habit dedupe/cap, real word count).
- **Reminders** (honest): `lib/notifications` + `ReminderScheduler` + settings UI.
  Web fires while open; native (Capacitor) seam documented.
- **Supabase Auth + cloud sync**: client, `AuthProvider`/`useAuth`, `/login`
  (email+password, validated), `(protected)` route-group gate, sign-out in
  settings, `SyncProvider`, `anchor_user_states` migration with RLS.

## Blocked / needs the human

- **Supabase project + keys** → create/select an Anchor Supabase project, run
  `supabase/migrations/20260607161931_create_anchor_user_states.sql`, then set
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally
  and in Vercel production. Without these, production cannot persist journals
  across devices.
- **Decision**: Sentry DSN — wire now (no-op without DSN) or wait?

---

## Workstreams (parallelizable)

Each is self-contained. **To avoid collisions, run each in its own git
worktree/branch.** "Touches" lists the files; streams that touch `lib/store`
must not run concurrently with each other.

### WS-1 · Supabase cloud sync hardening
- Implemented baseline: whole-state row per user, RLS, initial local/remote merge,
  debounced cloud save.
- Next hardening: add visible sync status/errors, cross-tab realtime refresh,
  conflict timestamps per entry, and browser smoke with two signed-in sessions.

### WS-2 · Sentry (monitoring)  — isolated, parallel-safe
- `@sentry/nextjs`; init via env DSN, no-op without it. Capture in `app/error.tsx`
  + `app/global-error.tsx`. Touches: sentry config files, `next.config.mjs`,
  the two error files (1 line each).
- Done when: build green with and without DSN; a thrown error reports when DSN set.

### WS-3 · PWA / installability  — isolated, parallel-safe
- `app/manifest.ts`, icons in `public/`, theme-color (already in layout), optional
  service worker for offline shell. Makes "install to home screen / desktop" real.
- Done when: Lighthouse PWA installable; icon + manifest valid.

### WS-4 · Timeline charts (Recharts)  — isolated, parallel-safe
- The JD lists Recharts. Add a small mood/sleep trend chart to `components/timeline-view.tsx`
  (only this file). Keep the warm palette + reduced-motion respect.
- Done when: chart renders from real entries; empty state intact.

### WS-5 · Accessibility pass  — HIGH collision risk, run solo
- Keyboard support for the mood grid (`components/morning/step-mood.tsx`), focus
  rings, aria labels, color-contrast check, `prefers-reduced-motion` for framer.
- Touches many components → schedule when other UI streams are merged.

### WS-6 · Native build + showcase assets  — parallel-safe (no app-code edits)
- `npm run mobile:add:ios` / `:android` (needs Xcode/Android Studio), run in
  simulator, capture screen recordings. `npm run desktop:dev` for Electron caps.
- Produces the screenshots/video for LinkedIn + the portfolio case study.

### WS-7 · LinkedIn showcase  — no code
- See `CLAUDE.md` is not the place; guidance lives in the chat handoff / a future
  `docs/showcase.md`. Assets come from WS-6.

---

## Supabase setup

Run `supabase/migrations/20260607161931_create_anchor_user_states.sql` once in
the Anchor Supabase project. Auth → Providers → Email must be enabled. For
early testing, temporarily turn off "Confirm email"; turn it back on before a
public beta unless the onboarding copy explicitly explains instant accounts.

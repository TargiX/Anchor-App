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
3. Preview locally: `npm run dev` → http://localhost:3088
   (`package.json` pins `PORT=3088` so it does not collide with other local apps)
   (prod: `npm start`; native static export: `npm run build:native`).

## Architecture (the conventions that must hold)

Layered, typed, testable. Do not put domain logic in components.

```text
lib/
  time/        local-date keys (NOT UTC), time-of-day context. Pure + tested.
  domain/      zod schemas + inferred types (entry, habit), selectors
               (isMorningComplete, computeStreak…), validation. Pure + tested.
  store/       state.ts (AppState schema + migrate), persistence.ts (StoragePort
               — localStorage cache), cloud.ts (backend sync), store.ts
               (reactive, useSyncExternalStore), actions.ts (the only mutators).
  notifications/ port.ts (web adapter + Capacitor seam), schedule.ts (pure +
               tested), index.ts (reactive permission).
  backend/     client.ts (self-hosted backend client; bearer on native).
  auth/        credentials.ts (zod validators, tested).
components/    ui/ (shadcn primitives), feature components, providers.
app/           / (landing), /login, (app)/ group = main app routes,
               (protected)/ = auth-gated voice prototype.
```

Rules:
- **Schemas are the source of truth**; types are `z.infer`. Validate at the
  storage boundary, trust types inside.
- **Components never call `setState` directly** — only `lib/store/actions`.
- **No magic numbers** — limits live in `lib/domain/validation` (`LIMITS`).
- **Day keys are local** (`lib/time/today`), never `toISOString()`.
- **Radix data-attrs**: target `data-[orientation=…]` / `data-[state=…]`, never
  the legacy `data-horizontal`/`data-active` (that bug class bit us twice).
- **Graceful degradation**: missing backend env may keep local dev usable, but
  production must configure the backend because journal data is user-owned.
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
- **zod + vitest** suites (time, selectors, migrate, validation, schedule,
  credentials, sync-status); run `npm test` for the current count.
- **Resilience**: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- **Input validation** wired (intention/journal limits, habit dedupe/cap, real word count).
- **Reminders** (honest): `lib/notifications` + `ReminderScheduler` + settings UI.
  Web fires while open; native (Capacitor) seam documented.
- **Self-hosted backend + cloud sync**: `server/` (Better Auth + Postgres on the
  shared apps server), `AuthProvider`/`useAuth`, `/login` (email+password,
  validated), `(protected)` gate on the voice prototype plus an anonymous
  save-prompt in the ritual flow, sign-out in settings,
  `SyncProvider`, `anchor_user_states` table. See `docs/backend.md`.
- **Backend deployed and verified** (2026-09-20): Coolify + `api.anchorapp.cc`,
  DNS, Vercel env, nightly backups with a rehearsed R2 restore, protocol smoke
  (concurrent writes → one 200 / one 409). Verification record and remaining
  release work in `docs/backend.md`.
- **Sentry wired, no-op without DSN**: `@sentry/nextjs`, `sentry.{server,edge}.config.ts`,
  `instrumentation.ts`, `withSentryConfig` in `next.config.mjs`.
- **PWA installability**: `app/manifest.ts`, `public/sw.js` +
  `ServiceWorkerRegistrar`, theme-color in the viewport export.
- **Timeline charts**: Recharts mood/sleep trend in `components/timeline-chart.tsx`,
  lazy-loaded (dynamic import), reduced-motion aware, fed by real entries.

## Blocked / needs the human

- Backend deploy is **done** (verified 2026-09-20, see `docs/backend.md`).
  Still open, per that doc's "Remaining product/release work": signed-in
  browser + physical-device sync validation (conflicting edits, 30s polling),
  password-reset email via `RESEND_API_KEY`, in-app account deletion against
  the deployed backend.
- **Decision**: Sentry is wired and no-ops without a DSN — create a Sentry
  project and set `SENTRY_DSN` in production, or consciously stay without.
- Credentials live in the owner's secret manager (`~/.ssh/hetzner-apps/`).

---

## Workstreams (parallelizable)

Each is self-contained. **To avoid collisions, run each in its own git
worktree/branch.** "Touches" lists the files; streams that touch `lib/store`
must not run concurrently with each other.

### WS-1 · Backend cloud sync hardening
- Largely done: deployed backend, whole-state row per user, session-scoped
  access, initial local/remote merge, debounced cloud save, 30s version
  polling, and visible sync status/offline/conflict reporting
  (`lib/store/sync-status`, `SyncStatusIndicator`).
- Remaining: browser smoke with two signed-in sessions and physical-device
  validation (conflicting edits, convergence) before advertising sync.

### WS-2 · Sentry (monitoring)  — done except the DSN decision
- Wired: `@sentry/nextjs`, `sentry.{server,edge}.config.ts` via
  `instrumentation.ts`, `withSentryConfig` in `next.config.mjs`. No-op without
  `SENTRY_DSN`; no PII, no traces.
- Done when: a DSN is set (or consciously skipped) and a thrown error reports.

### WS-3 · PWA / installability  — done
- `app/manifest.ts`, icons via `/pwa-icon/<size>`, theme-color in the viewport
  export, `public/sw.js` registered by `ServiceWorkerRegistrar`.
- Remaining if touched again: re-run the Lighthouse installability check.

### WS-4 · Timeline charts (Recharts)  — done
- `components/timeline-chart.tsx` renders mood/sleep trends from real entries,
  dynamically imported so Recharts stays out of the initial bundle;
  reduced-motion aware; empty state intact.

### WS-5 · Accessibility pass  — HIGH collision risk, run solo
- Keyboard support for the mood grid (`components/morning/step-mood.tsx`), focus
  rings, aria labels, color-contrast check, `prefers-reduced-motion` for framer.
- Touches many components → schedule when other UI streams are merged.

### WS-6 · Native build + showcase assets  — parallel-safe (no app-code edits)
- `npm run mobile:add:ios` / `:android` (needs Xcode/Android Studio), run in
  simulator, capture screen recordings. `npm run desktop:dev` for Electron caps.
- Produces the screenshots/video for LinkedIn + the portfolio case study.

### WS-7 · LinkedIn showcase  — no code
- Guidance lives in `docs/showcase.md`. Assets come from WS-6.

---

## Backend setup

The backend is a standalone service in `server/` (Better Auth + Postgres on
the shared Hetzner apps server). Provisioning, env vars, Coolify deploy steps,
and backup requirements live in `docs/backend.md`. The `anchor` database and
restricted role are already provisioned; the schema migrates itself at boot.

Google sign-in is deferred: Better Auth supports it via social config, but it
needs a Google Cloud OAuth client plus a native callback design. The login UI
already hides the Google button when the provider is absent.

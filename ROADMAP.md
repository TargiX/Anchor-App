# Anchor — Roadmap & Handoff

Single source of truth for what this app is, what's done, and what's next.
Written so a fresh session (or a parallel agent) can pick up cold.

**Anchor** is a daily-ritual app (morning/evening check-ins: mood, sleep,
intention, journal, meditation, habits) built as a portfolio piece that is
also a _real_ app. Web (Vercel) + mobile (Capacitor) + desktop (Electron) from
one Next.js codebase.

---

## How to get oriented (do this first)

1. Read this file + `CLAUDE.md`.
2. Run the gate to confirm a green baseline:
   ```bash
   npm install
   npm run check
   ```
3. Preview locally: `npm run dev` → http://localhost:3000
   (prod: `npm start`; native static export: `npm run build:native`).

## Architecture (the conventions that must hold)

Layered, typed, testable. Do not put domain logic in components.

```
lib/
  time/        local-date keys (NOT UTC), time-of-day context. Pure + tested.
  domain/      zod schemas + inferred types (entry, habit), selectors
               (isMorningComplete, computeStreak…), validation. Pure + tested.
  store/       state.ts (AppState schema + migrate), persistence.ts (StoragePort
               — localStorage now, Capacitor seam later), store.ts (reactive,
               useSyncExternalStore), actions.ts (the only mutators), index.ts.
  notifications/ port.ts (web adapter + Capacitor seam), schedule.ts (pure +
               tested), index.ts (reactive permission).
  supabase/    client.ts (null when unconfigured → app stays local-only).
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
- **Graceful degradation**: missing env (Supabase) must never break the app.
- **No slop**: every screen handles empty/loading/error; no fake/cosmetic
  features; review AI output.

Quality gate (must pass before "done"): `npm run check`. Native-facing changes
also run `npm run check:native`; Electron-facing changes run `npm run
check:desktop`. Verify user-facing changes in the browser.

---

## Done (this far)

- Landing `/`; dashboard moved to `/app` (clickable ritual cards).
- Capacitor + Electron wired; `BUILD_TARGET=native` → static export (`out/`).
- Fixed systemic Radix `data-*` mismatch (slider, tabs, separator, dialog, sheet).
- **Architecture refactor**: `lib/time`, `lib/domain`, `lib/store` layers.
- **zod + vitest**; 54 tests (time, selectors, migrate, validation, schedule, credentials, store isolation, review flows, daily prompt selection, native reminders).
- **Resilience**: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- **Input validation** wired (intention/journal limits, habit dedupe/cap, real word count).
- **Reminders**: `lib/notifications` + `ReminderScheduler` + settings UI.
  Web fires while open; iOS uses Capacitor Local Notifications with daily
  morning/evening pending reminders.
- **Supabase Auth (A)**: client, `AuthProvider`/`useAuth`, `/login` (email+password,
  validated), `(protected)` route-group gate, sign-out in settings, `.env.example`.
- **Local quality gate**: `npm run check`, `check:native`, and `check:desktop`
  with an explicit Node 24 guard.
- **Accessibility pass**: keyboard/focus/ARIA polish across core ritual flows,
  reduced-motion handling for Framer Motion, browser zoom enabled, and
  render-time random prompt selection removed to prevent hydration drift.

## Blocked / needs the human

- **Supabase keys** → put `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in `.env.local`. Without them the app runs local-only (by design).
- **Decision**: Sentry DSN — wire now (no-op without DSN) or wait?

---

## Workstreams (parallelizable)

Each is self-contained. **To avoid collisions, run each in its own git
worktree/branch.** "Touches" lists the files; streams that touch `lib/store`
must not run concurrently with each other.

### WS-1 · Supabase cloud sync (B) — depends on keys

- Goal: entries sync across devices; localStorage stays offline cache.
- SQL (run in Supabase SQL editor) is in the bottom of this file.
- Touches: `lib/supabase/sync.ts` (new), `components/sync-controller.tsx` (new,
  mount in layout), `lib/store/store.ts` (hydrate-from-remote hook).
- Approach: pull on sign-in, merge (union entries; whole-state LWW by
  `updated_at` for conflicts), debounced push on change. Document the LWW caveat.
- ⚠️ Touches the store → do NOT run in parallel with other store-touching work.
- Done when: sign in on two browsers, an entry made in one appears in the other.

### WS-2 · Sentry (monitoring) — isolated, parallel-safe

- `@sentry/nextjs`; init via env DSN, no-op without it. Capture in `app/error.tsx`
  - `app/global-error.tsx`. Touches: sentry config files, `next.config.mjs`,
    the two error files (1 line each).
- Done when: build green with and without DSN; a thrown error reports when DSN set.

### WS-3 · PWA / installability — isolated, parallel-safe

- `app/manifest.ts`, icons in `public/`, theme-color (already in layout), optional
  service worker for offline shell. Makes "install to home screen / desktop" real.
- Done when: Lighthouse PWA installable; icon + manifest valid.

### WS-4 · Timeline charts (Recharts) — isolated, parallel-safe

- The JD lists Recharts. Add a small mood/sleep trend chart to `components/timeline-view.tsx`
  (only this file). Keep the warm palette + reduced-motion respect.
- Done when: chart renders from real entries; empty state intact.

### WS-5 · Accessibility pass — DONE

- Completed through Linear `PHS-92`: mood grid, pickers, tabs, habit controls,
  settings controls, timeline expansion, login switch, reduced-motion handling,
  zoom metadata, and browser sweep.

### WS-6 · Native build + showcase assets — parallel-safe (no app-code edits)

- `npm run mobile:add:ios` / `:android` (needs Xcode/Android Studio), run in
  simulator, capture screen recordings. `npm run desktop:dev` for Electron caps.
- Produces the screenshots/video for LinkedIn + the portfolio case study.
- iOS simulator smoke notes live in `docs/ios-simulator-smoke.md`. Current
  status: scaffold/build/install/launch works, manual morning/evening smoke
  passed in iPhone 17 Pro Simulator, safe-area overlap fixed via Capacitor
  StatusBar config, and native local reminders were verified via the iOS
  permission prompt plus simulator pending notification records.

### WS-7 · LinkedIn showcase — no code

- See `CLAUDE.md` is not the place; guidance lives in the chat handoff / a future
  `docs/showcase.md`. Assets come from WS-6.

---

## Supabase sync SQL (run once, for WS-1)

```sql
create table public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own state - select" on public.user_state
  for select using (auth.uid() = user_id);
create policy "own state - insert" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "own state - update" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Auth → Providers → Email: enabled. For frictionless testing, temporarily turn
off "Confirm email".

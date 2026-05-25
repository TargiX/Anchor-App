# CLAUDE.md

Anchor — a daily-ritual app (web + Capacitor mobile + Electron desktop) from one
Next.js 16 / React 19 / TS codebase. Portfolio piece, built as a *real* app.

**Read `ROADMAP.md` first** — it holds the current state, architecture, and the
parallelizable workstreams. This file is the short version for every session.

## Always run the gate before calling work "done"
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Verify user-facing changes in the browser (`npm run dev`, or `npm start` for prod).

## Non-negotiable conventions
- **Layers**: domain logic lives in `lib/` (time / domain / store / notifications /
  supabase / auth), never in components. See ROADMAP "Architecture".
- **zod schemas are the source of truth**; types are `z.infer`. Validate at the
  storage boundary only.
- **Mutate state only via `lib/store/actions`** — never `setState` in a component.
- **Day keys are local** via `lib/time/today` — never `toISOString()` (UTC bug).
- **Limits/magic numbers** live in `lib/domain/validation` (`LIMITS`).
- **Radix Tailwind variants**: use `data-[orientation=…]` / `data-[state=…]`.
  The legacy `data-horizontal` / `data-active` forms silently do nothing.
- **Graceful degradation**: no env (e.g. Supabase) must never crash the app.
- **No slop**: handle empty/loading/error states; no cosmetic-only features;
  always read & correct AI-generated code (it fails on older patterns).

## Parallel work
Use a separate git worktree/branch per workstream. Anything touching `lib/store`
runs solo (no concurrent store edits). See ROADMAP "Workstreams".

## Commands
`dev` · `build` · `start` · `test` / `test:watch` · `typecheck` · `lint` ·
`build:native` (static export for Capacitor) · `cap:sync` · `desktop:dev` ·
`mobile:add:ios|android`.

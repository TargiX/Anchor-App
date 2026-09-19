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

**Dependency changes:** npm 10.x crashes re-resolving this tree
(`edgesOut` arborist bug). `npm install`/`npm ci` on the committed lockfile
works fine; to add/upgrade packages use `npx npm@11 install ...` instead.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

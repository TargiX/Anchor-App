# Anchor backend

Self-hosted auth + journal sync service, replacing Supabase. Runs on the shared
Hetzner apps server (Coolify + shared PostgreSQL 18) per the Apps Server guide.

## Architecture

```
web (Vercel)  ──same-origin rewrite──▶  backend (Coolify, api.anchorapp.cc)
iOS (Capacitor) ──bearer token, direct──▶            │
                                                     ▼
                                       shared Postgres 18 (private Docker net)
                                       database `anchor`, role `anchor`
```

- **Web**: Vercel rewrites `/api/auth/*` and `/api/data/*` to the backend, so
  the better-auth session cookie is first-party. No CORS needed.
- **Native**: calls `NEXT_PUBLIC_BACKEND_URL` directly with
  `Authorization: Bearer <token>` (better-auth `bearer` plugin; token captured
  from the `set-auth-token` response header and stored in Capacitor
  Preferences).
- **Data**: one row per user in `anchor_user_states` (`state` jsonb +
  `updated_at`). `PUT` accepts `baseUpdatedAt` for optimistic conflict
  detection → `409` returns the server row. The version check and write are
  serialized by a per-user row lock, including concurrent first writes. An
  omitted base is accepted only when no server state exists.
  `GET /api/data/state/version` is
  the cheap polling endpoint that replaced Supabase realtime.

## Files

- `server/src/index.ts` — Fastify routes: `/health`, `/api/auth/*` mount,
  `/api/data/state*` (session-scoped).
- `server/src/auth.ts` — better-auth (email+password, bearer plugin, `anchor`
  cookie prefix).
- `server/src/migrate.ts` + `server/migrations/*.sql` — versioned migrations,
  advisory-locked, applied at boot before auth init.
- `server/Dockerfile` — non-root Node 24 image; build context is `server/`.

## Environment

Backend (Coolify runtime secrets — never in the image or repo):

| Var                    | Value                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://anchor:<password>@xbeb28ab2vmmbquowjt1pvt2:5432/anchor`            |
| `BETTER_AUTH_SECRET`   | 64-hex secret (owner's secret manager)                                           |
| `BETTER_AUTH_URL`      | `https://api.anchorapp.cc`                                                       |
| `AUTH_TRUSTED_ORIGINS` | `https://anchorapp.cc,https://www.anchorapp.cc,https://anchor.ilyamoskovkin.com` |
| `PORT`                 | `3000`                                                                           |
| `HOST`                 | Optional listen host; defaults to `0.0.0.0`                                      |
| `RESEND_API_KEY`       | Resend sending key; without it emails are skipped (nothing is logged)        |
| `AUTH_EMAIL_FROM`      | Verified sender, for example `Anchor <no-reply@phosphene.cc>`                    |

Frontend (Vercel env):

| Var                       | Value                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.anchorapp.cc` (required to enable auth/sync in both web and native builds) |
| `BACKEND_URL`             | `https://api.anchorapp.cc` (server-side session check in the anchor-checkins route)     |

## Local development

Use the `safe-local-dev` workflow: resolve the worktree and run `dev-safe
inspect` before starting any listener. Install dependencies with `npm ci`
at the root and in `server/`. Use a disposable local PostgreSQL database and
keep its connection string and a generated auth secret in ignored environment
files. Do not use the production database for local development.

Launch the backend through `dev-safe run` with an explicit `HOST=127.0.0.1`
and use its actual assigned port. Set frontend `BACKEND_URL` and
`NEXT_PUBLIC_BACKEND_URL` to that exact printed backend URL, then launch the
frontend through the same worktree-aware workflow. Add the frontend's actual
origin to `AUTH_TRUSTED_ORIGINS`. Do not assume a fixed localhost port.

`NEXT_PUBLIC_BACKEND_URL` gates `isBackendConfigured`: unset means local-only
mode (no login gate, no sync). Web auth/data requests go through same-origin
rewrites; native builds use the configured URL directly.

Without `RESEND_API_KEY` and `AUTH_EMAIL_FROM`, email delivery is skipped and a
token-free notice is logged — reset links never appear in logs.

## Deploy (Coolify, manual)

1. New application from this repo, build context `server/`, Dockerfile build.
2. Attach the container to the `coolify` Docker network (it must resolve
   `xbeb28ab2vmmbquowjt1pvt2`).
3. Set the runtime secrets above. Domain `api.anchorapp.cc` → port 3000.
   Coolify base directory `/server`, Dockerfile `/Dockerfile`. Configure the
   HTTP health check explicitly as `http://127.0.0.1:3000/health`; Alpine wget
   can resolve `localhost` to IPv6 while Fastify listens on IPv4. Coolify
   overrides the Docker image health check when its own check is enabled.
4. DNS: `api.anchorapp.cc` A record → `168.119.179.33`.
5. Deploy; check `/health` returns `{"ok":true,"db":"up"}` over HTTPS.
6. **Backups**: add the `anchor` database to the R2 backup schedule in Coolify
   — new databases are NOT covered automatically. Verify one upload, rehearse
   a restore into a disposable instance.

## Deployment verification — 2026-09-20

- DNS `api.anchorapp.cc` resolves to `168.119.179.33`; HTTPS `/health` returns
  HTTP 200 with `{"ok":true,"db":"up"}` and a trusted certificate.
- Coolify app UUID `4eh25ym21yikmlsgcgdo5lyn`, branch
  `TargiX/deploy-anchor-backend`. The first verified application build was
  `011c66f013bcd2651853c7c7e6862b5003e17be2`; subsequent hardening adds
  explicit `private, no-store` headers to account and journal responses.
- The `anchor` role can connect to `anchor` and cannot connect to
  `narrative_flow`; PostgreSQL remains on the private Docker network.
- Live HTTP tests used two separately signed-in sessions of one synthetic
  account. Concurrent first writes and concurrent updates each returned exactly
  one 200 and one 409. Stale updates could not overwrite committed state.
- Production Vercel project `anchor` has both backend URL variables set.
  Deployment `dpl_Ggp1cVLTQxyNwM5YidGGSPTKazKE` is READY and aliased to
  `https://anchorapp.cc`. The full protocol smoke suite also passed through
  the same-origin Vercel proxy, including both simultaneous-write checks.
- Signup, cookie sessions, bearer auth, unauthenticated rejection, cross-account
  read isolation, payload rejection, and session-specific logout passed.
- Dedicated daily database backup at **02:30 UTC**, **7 local / 30 R2** copies.
  First execution uploaded 10,896 bytes to R2. Downloaded the R2 object and
  restored it into a disposable database: six tables, one existing user, one
  journal state. The disposable database was then removed.
- 281 frontend tests passed in 34 files, frontend typecheck passed, standalone
  backend build passed, and the production frontend build contract passed.

These are backend protocol and build checks, not browser or physical-device
sync proof. Browser automation was unavailable during this deployment pass.

## Remaining product/release work

- Test actual signed-in browser sessions and physical devices, including
  conflicting edits and 30-second polling convergence, before advertising sync.
- Deploy and verify password-reset email delivery with `RESEND_API_KEY` and
  `AUTH_EMAIL_FROM`; email verification remains deferred.
- Verify in-app account deletion against the deployed backend before App Store
  submission.
- Google sign-in is disabled and hidden.
- Resolve anonymous edits made while authentication is still loading.
- Validate visible syncing/offline/conflict status in the actual product UI.

The existing `ilya@targix.dev` smoke-test account was retained. Deployment-only
synthetic accounts are removed after verification. Source review is tracked in
[PR #61](https://github.com/TargiX/Anchor-App/pull/61); deployment does not mean
that the PR is merged or the native release is ready.

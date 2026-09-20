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
  detection → `409` returns the server row. `GET /api/data/state/version` is
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

| Var | Value |
|---|---|
| `DATABASE_URL` | `postgresql://anchor:<password>@xbeb28ab2vmmbquowjt1pvt2:5432/anchor` |
| `BETTER_AUTH_SECRET` | 64-hex secret (owner's secret manager) |
| `BETTER_AUTH_URL` | `https://api.anchorapp.cc` |
| `AUTH_TRUSTED_ORIGINS` | `https://anchorapp.cc,https://www.anchorapp.cc` |
| `PORT` | `3000` |

Frontend (Vercel env):

| Var | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.anchorapp.cc` (required for native builds; web works without it via rewrites) |
| `BACKEND_URL` | `https://api.anchorapp.cc` (server-side session check in the anchor-checkins route) |

## Local development

```bash
cd server
npm install

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anchor \
BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
npm run dev
```

`NEXT_PUBLIC_BACKEND_URL` also gates `isBackendConfigured`: unset → the app
runs in documented local-only mode (no login gate, no sync). For local dev
set both vars to the local backend, e.g. `http://localhost:3100`.

Any local Postgres works; migrations create the schema. The frontend dev
server proxies `/api/auth/*` and `/api/data/*` to `BACKEND_URL` (default
`http://localhost:3000`) via `next.config.mjs`.

## Deploy (Coolify, manual)

1. New application from this repo, build context `server/`, Dockerfile build.
2. Attach the container to the `coolify` Docker network (it must resolve
   `xbeb28ab2vmmbquowjt1pvt2`).
3. Set the runtime secrets above. Domain `api.anchorapp.cc` → port 3000.
4. DNS: `api.anchorapp.cc` A record → `168.119.179.33`.
5. Deploy; check `/health` returns `{"ok":true,"db":"up"}` over HTTPS.
6. **Backups**: add the `anchor` database to the R2 backup schedule in Coolify
   — new databases are NOT covered automatically. Verify one upload, rehearse
   a restore into a disposable instance.

## Verified

- `anchor` role connects to `anchor` DB; denied on `narrative_flow`.
- Migrations applied cleanly; sign-up → session → state PUT/GET/version →
  409 conflict path all exercised over the real DB via SSH tunnel.
- Bearer token auth works on all routes (native path).

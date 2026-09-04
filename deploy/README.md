# Deploying the NuruNode API for the hosted NuruRoute preview

The public site (`src/`) never calls the API from the browser. Its server-side
proxy at `/api/nuru/*` forwards to `NURU_API_URL` (default `http://localhost:4000`).
On the hosted preview that host does not exist, so `/console` falls back to
labelled simulated data. To use real organisations there, deploy the API and
set `NURU_API_URL` as a **project secret** (server env), not in `.env`.

Nothing in `apps/api`, `packages`, or the migrations changes for this — only the
files in `deploy/` are new.

## 1. Provision Postgres
Any managed Postgres 16 works (Fly Postgres, Neon, Supabase, Railway). Keep the
connection string as `DATABASE_URL`.

## 2. Deploy the container (Fly.io example)
```bash
fly launch --no-deploy --copy-config --config deploy/fly.toml --dockerfile deploy/api.Dockerfile
fly secrets set \
  DATABASE_URL='postgres://...' \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  MOCK_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
  WEB_ORIGIN='https://id-preview--bbccbe99-2ae9-4506-b8a3-707fda0b19ac.lovable.app'
fly deploy --config deploy/fly.toml --dockerfile deploy/api.Dockerfile
curl https://nurunode-api.fly.dev/health
```
Railway/Render: point the service at `deploy/api.Dockerfile`, add the same
environment variables, expose port 4000.

`WEB_ORIGIN` only matters for the Next dashboard (`apps/web`); the public site's
proxy is server-to-server and needs no CORS entry.

## 3. Point the public site at it
In Lovable, add the secret `NURU_API_URL=https://nurunode-api.fly.dev`
(no trailing slash). The proxy reads it at request time; no code change needed.

## 4. Safety checklist (mock money only)
- `PAYMENT_ADAPTER=mock_momo` and `PROVIDER_ADAPTER=mock` — the API refuses live
  MoMo environments and no provider keys are set. `/health` must report
  `"liveMoney": false`.
- `ALLOW_DEV_LOGIN=true` means anyone with the URL can create an account and an
  organisation holding *test* GHS. Acceptable for an investor demo; turn it off
  (and finish Google sign-in) before anything touches real funds.
- The proxy never forwards `/webhooks/*` or `/auth/google`, so the mock webhook
  is only reachable directly with `MOCK_WEBHOOK_SECRET`.

# Deploy API on Railway (Nixpacks — no Docker)

Canonical production API host for this project (Vercel frontend + Supabase Postgres). Overview: [`DEPLOY_API.md`](./DEPLOY_API.md).

## Dashboard settings (Option 1)

**Railway → your API service → Settings**

### General

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |

### Build

| Setting | Value |
|---------|--------|
| **Builder** | Nixpacks (Railway default — **not** Dockerfile) |
| **Dockerfile path** | *(leave empty / remove)* |
| **Build command** | *(leave empty — Nixpacks runs `npm ci`)* |
| **Watch paths** | `backend/**` *(optional)* |

### Deploy

| Setting | Value |
|---------|--------|
| **Start command** | `npm start` |
| **Healthcheck path** | `/health/live` |

`npm start` runs `prisma migrate deploy` then `node server.js`.

### Networking

| Setting | Value |
|---------|--------|
| **Public domain** | e.g. `inventoryapp-production-dfa1.up.railway.app` |
| **Target port** | **Remove / leave automatic** — do **not** hardcode `5000` |

Railway injects `PORT` at runtime. A fixed target port of 5000 while the app listens on another port causes [502 Application failed to respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond).

### Variables (required)

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | random 32+ characters |
| `DATABASE_URL` | Supabase **session pooler** + `?pgbouncer=true&connection_limit=1&pool_timeout=60&sslmode=require` |
| `DIRECT_URL` | Supabase **direct** `db.xxx.supabase.co` + `?sslmode=require` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

Do **not** set `PORT` manually.

Optional: `MARKETING_URL`, `ALLOW_PUBLIC_REGISTRATION=true`

**Before real users** (see [`GO_LIVE.md`](./GO_LIVE.md)):

| Variable | Recommended |
|----------|-------------|
| `DASHBOARD_DEMO_REVENUE` | `false` (default off when `NODE_ENV=production`) |
| `SUBSCRIPTION_ENFORCE` | `true` after Stripe webhooks work |
| `SENTRY_DSN` | Your Sentry project DSN |
| `EMAIL_*` | SMTP for password reset |
| `STRIPE_*` | Live keys when billing is on |
| `SUPABASE_URL` | `https://YOUR_REF.supabase.co` — durable photo storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose to frontend |
| `SUPABASE_STORAGE_BUCKET` | `photos` (default) |

After changes → **Redeploy**.

---

## Config-as-code

[`railway.toml`](../railway.toml) at repo root sets Nixpacks + start command + healthcheck. You still must set **Root Directory = `backend`** in the dashboard (monorepo).

[`backend/nixpacks.toml`](../backend/nixpacks.toml) pins Node 20.

Link the config file: **Settings → Config-as-code → Add file path** → `railway.toml` (after you push).

---

## Verify

```text
GET https://YOUR-SERVICE.up.railway.app/health/live   → {"status":"OK"}
GET https://YOUR-SERVICE.up.railway.app/health        → "database": "connected"
```

Deploy logs should include:

```text
PostgreSQL connected (Prisma)
Server running on http://0.0.0.0:...
```

---

## Troubleshooting

| Log / symptom | Fix |
|---------------|-----|
| `FRONTEND_URL must be set in production` | Add `FRONTEND_URL` |
| `DATABASE_URL is required` | Add pooler URL |
| Prisma migrate error | Fix `DIRECT_URL` |
| 502, deploy “successful” | Remove target port 5000; check logs for crash |
| Wrong builder | Switch off Dockerfile → Nixpacks |

---

## Vercel frontend

```text
VITE_API_URL=https://YOUR-SERVICE.up.railway.app
```

No `/api/v1` suffix. Redeploy frontend after updating.

---

## Push to GitHub

Railway redeploys from Git when connected. Commit at least:

- `backend/server.js` (listen on `0.0.0.0` + `PORT`)
- `backend/package.json` (`npm start` with migrate)
- `railway.toml`, `backend/nixpacks.toml`

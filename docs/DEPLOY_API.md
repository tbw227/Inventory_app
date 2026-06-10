# Deploy the API (production)

The SPA on **Vercel** is static only. The **Express API** runs on **[Railway](https://railway.com)** (Nixpacks) with your existing **Supabase** database.

**Step-by-step Railway dashboard settings:** [`docs/RAILWAY.md`](./RAILWAY.md)  
**Before inviting users:** [`docs/GO_LIVE.md`](./GO_LIVE.md)

## Architecture

```text
Browser → Vercel (React) → /api/v1/* proxied to → Railway (Express) → Supabase (Postgres)
```

## 1. Prerequisites

- Supabase project with migrations applied (`npx prisma migrate deploy` from `backend/`).
- Seed data optional: `npm run seed --prefix backend`.
- Vercel app URL (e.g. `https://inventory-app-delta-seven.vercel.app`).

### Supabase connection strings

In **Supabase → Project Settings → Database**:

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | **Session pooler** (port 5432, `?pgbouncer=true&connection_limit=1`) for the running API |
| `DIRECT_URL` | **Direct** host (`db.xxx.supabase.co`) for Prisma migrations on container start |

Copy both into Railway service variables. See comments in [`backend/.env.sample`](../backend/.env.sample).

## 2. Deploy API on Railway

1. Push this repo to GitHub.
2. **Railway → New Project → Deploy from GitHub** → select this repo.
3. Add a service with **Root Directory** = `backend`.
4. **Builder:** Nixpacks (not Dockerfile). Config-as-code: [`railway.toml`](../railway.toml) at repo root (link in **Settings → Config-as-code**).
5. **Start command:** `npm start` (runs `prisma migrate deploy` then `node server.js`).
6. **Healthcheck path:** `/health/live`
7. **Do not** set `PORT` manually or hardcode target port `5000` — Railway injects `PORT` at runtime.
8. Set variables (minimum):

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | random 32+ characters |
| `DATABASE_URL` | Supabase session pooler URL |
| `DIRECT_URL` | Supabase direct URL (migrations) |
| `FRONTEND_URL` | Your Vercel origin, e.g. `https://your-app.vercel.app` |

Optional: `MARKETING_URL`, `ALLOW_PUBLIC_REGISTRATION=true`, Stripe, `SENTRY_DSN`, `REDIS_URL`.

Full dashboard table and troubleshooting: [`docs/RAILWAY.md`](./RAILWAY.md).

### Verify the API

Replace with your Railway URL (e.g. `https://inventoryapp-production-dfa1.up.railway.app`):

```text
GET https://YOUR-SERVICE.up.railway.app/health/live   → {"status":"OK"}
GET https://YOUR-SERVICE.up.railway.app/health        → "database": "connected"
```

Login route exists if POST returns **400/401** (not **404**):

```text
POST https://YOUR-SERVICE.up.railway.app/api/v1/auth/login
Content-Type: application/json

{"email":"alice@example.com","password":"Admin123!"}
```

## 3. Wire Vercel (frontend)

1. **Vercel → Project → Settings → Environment Variables**
2. Set **`VITE_API_URL`** = `https://YOUR-SERVICE.up.railway.app`  
   (origin only — **no** `/api/v1` suffix)
3. **Redeploy** the frontend (env vars apply at build time).

The build runs [`frontend/scripts/vercel-build-setup.mjs`](../frontend/scripts/vercel-build-setup.mjs), which proxies `your-app.vercel.app/api/*` → your Railway API.

## 4. CORS / auth checklist

On **Railway**, confirm:

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `ALLOW_PUBLIC_REGISTRATION` | `true` if marketing signup is enabled |

The API **will not start** in production without at least one origin in `FRONTEND_URL`.

## 5. Demo login (after seed)

| Role | Email | Password |
|------|--------|----------|
| Admin | `alice@example.com` | `Admin123!` |
| Tech | `bob@example.com` | `Tech123!` |

## 6. Optional services

| Feature | Env vars |
|---------|----------|
| Stripe payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| Email (password reset) | `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` |
| Redis cache | `REDIS_URL` (Upstash free tier works) |
| Sentry | `SENTRY_DSN` |

## 7. Production notes

- **Uploads** (`uploads/photos`) are on container disk — not durable across redeploys; use object storage for production photos later.
- **Stripe webhooks** need a public URL: `https://YOUR-SERVICE.up.railway.app/api/webhooks/...`
- **Multiple API replicas** — set `REDIS_URL` so tenant cache is shared (see `backend/.env.sample`).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Vercel API 404 / wrong host | Set `VITE_API_URL` to Railway origin; redeploy frontend |
| CORS error in browser | Add exact Vercel URL to `FRONTEND_URL` on Railway, redeploy API |
| 502 on Railway | Remove hardcoded target port 5000; see [`docs/RAILWAY.md`](./RAILWAY.md) |
| API crash on start | Railway logs; usually missing `FRONTEND_URL` or bad `DATABASE_URL` |
| `database: error` on `/health` | Fix Supabase URLs; pooler for `DATABASE_URL`, direct for `DIRECT_URL` |
| 404 on login | Wrong API host or API not deployed; verify `/health/live` first |

## Local dev (unchanged)

From repo root:

```bash
npm run dev
```

Uses Vite proxy to `http://localhost:5000` — no `VITE_API_URL` needed in `frontend/.env`.

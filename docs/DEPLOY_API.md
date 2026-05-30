# Deploy the API (production)

The SPA on **Vercel** is static only. The **Express API** must run on a host that stays up (this guide uses **[Render](https://render.com)** + your existing **Supabase** database).

## Architecture

```text
Browser → Vercel (React) → /api/v1/* proxied to → Render (Express) → Supabase (Postgres)
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

Copy both into Render env vars (see below). See comments in [`backend/.env.sample`](../backend/.env.sample).

## 2. Deploy API on Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect the repo; Render reads [`render.yaml`](../render.yaml).
4. When prompted, set **sync: false** variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `FRONTEND_URL` — your Vercel URL, e.g. `https://inventory-app-delta-seven.vercel.app`
   - `MARKETING_URL` — marketing site if you have one (or repeat the app URL for now)
5. Deploy and wait until status is **Live**.

### Option B — Manual Web Service

1. **New → Web Service** → connect repo.
2. **Root directory:** `backend`
3. **Runtime:** Docker (uses [`backend/Dockerfile`](../backend/Dockerfile))
4. **Health check path:** `/health`
5. Add the same environment variables as in [`render.yaml`](../render.yaml).

`JWT_SECRET` is auto-generated in the Blueprint; for manual setup use a random 32+ character string.

### Verify the API

Replace with your Render URL (e.g. `https://inventory-api-xxxx.onrender.com`):

```text
GET https://YOUR-RENDER-SERVICE.onrender.com/health
```

Expect JSON with `"database": "connected"`.

Login route exists if POST returns **400/401** (not **404**):

```text
POST https://YOUR-RENDER-SERVICE.onrender.com/api/v1/auth/login
Content-Type: application/json

{"email":"alice@example.com","password":"Admin123!"}
```

## 3. Wire Vercel (frontend)

1. **Vercel → Project → Settings → Environment Variables**
2. Set **`VITE_API_URL`** = `https://YOUR-RENDER-SERVICE.onrender.com`  
   (origin only — **no** `/api/v1` suffix)
3. **Remove** any placeholder like `https://your-backend.onrender.com`.
4. **Redeploy** the frontend (env vars apply at build time).

The build runs [`frontend/scripts/vercel-build-setup.mjs`](../frontend/scripts/vercel-build-setup.mjs), which proxies `your-app.vercel.app/api/*` → your Render API.

## 4. CORS / auth checklist

On **Render**, confirm:

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

## 7. Limitations (free tier)

- **Render free** spins down after idle; first request may take ~30s.
- **Uploads** (`uploads/photos`) are on container disk — not durable across redeploys; use object storage for production photos later.
- **Stripe webhooks** need a public URL: `https://YOUR-RENDER-SERVICE.onrender.com/api/webhooks/...`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `your-backend.onrender.com` 404 | Replace placeholder `VITE_API_URL` on Vercel with your real Render URL |
| CORS error in browser | Add exact Vercel URL to `FRONTEND_URL` on Render, redeploy API |
| API crash on start | Check Render logs; usually missing `FRONTEND_URL` or bad `DATABASE_URL` |
| `database: error` on `/health` | Fix Supabase URLs; pooler for `DATABASE_URL`, direct for `DIRECT_URL` |
| 404 on login | Wrong API host or API not deployed; verify `/health` first |

## Local dev (unchanged)

From repo root:

```bash
npm run dev
```

Uses Vite proxy to `http://localhost:5000` — no `VITE_API_URL` needed in `frontend/.env`.

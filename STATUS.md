# Project status

**Last updated:** June 2026

Short snapshot for quick scanning. **Setup & stack:** [README.md](./README.md).

## What shipped

- **Backend:** Express API with Prisma on **PostgreSQL**, JWT auth, multi-tenant company scoping, jobs/supplies/clients/users/locations, dashboard aggregates, payments (Stripe), weather proxies, uploads, QuickBooks integration hooks, Swagger at `/api/docs`.
- **Frontend:** React + Vite + Tailwind SPA (lazy routes): login, dashboard, jobs, inventory, settings, payments UI, scan/labels where wired.
- **Ops:** Railway (Nixpacks API) + Vercel (SPA) + Supabase; Docker Compose for local; GitHub Actions CI (migrations, backend tests, frontend build, npm audit).

## Tests

- **50** Jest tests in `backend/__tests__/`. Run `npm test` from `backend/` with `DATABASE_URL` set and migrations applied (same pattern as CI).

## Docs to use

- **[docs/GO_LIVE.md](docs/GO_LIVE.md)** — checklist before real users/clients.
- [docs/DEPLOY_API.md](docs/DEPLOY_API.md) / [docs/RAILWAY.md](docs/RAILWAY.md) — production deploy.
- [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md) — contributor patterns.
- [SUPABASE.md](SUPABASE.md) — hosted database.
- [AUDIT.md](AUDIT.md) / [SECURITY.md](SECURITY.md) — gaps and hardening roadmap.

## Next (product / engineering)

**Launch blockers**

1. Complete [GO_LIVE.md](docs/GO_LIVE.md) Phases 1–3 (env, Stripe/email, browser smoke test).
2. Do **not** seed production with default passwords; use `SEED_ADMIN_PASSWORD` / `SEED_TECH_PASSWORD` if seeding at all.
3. Plan durable uploads (Supabase Storage) — Railway disk is ephemeral. **Wire `SUPABASE_*` on the API** (see `SUPABASE.md` §4).

**Soon after launch**

- Frontend smoke tests (Vitest); expand backend coverage.
- `SUBSCRIPTION_ENFORCE=true` when billing is verified.
- Optional `REDIS_URL` if API replicas > 1.
- JWT revocation / httpOnly refresh (see AUDIT.md 61–90 day plan).

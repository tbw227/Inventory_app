# Project status

**Last updated:** April 2026

This file is a short snapshot for quick scanning. **Authoritative setup, stack, and links:** [README.md](./README.md).

## What shipped

- **Backend:** Express API with Prisma on **PostgreSQL**, JWT auth, multi-tenant company scoping, jobs/supplies/clients/users/locations, dashboard aggregates, payments (Stripe), weather proxies, uploads, QuickBooks integration hooks, Swagger at `/api/docs`.
- **Frontend:** React + Vite + Tailwind SPA (lazy routes): login, dashboard, jobs, inventory, settings, payments UI, scan/labels where wired.
- **Ops:** Docker Compose for Postgres + API + frontend image; GitHub Actions CI (migrations, backend tests, frontend build).

## Tests

- **27** Jest tests in `backend/__tests__/`. Run `npm test` from repo root (delegates to backend) or `npm test` inside `backend/` with `DATABASE_URL` set and migrations applied (same pattern as CI).

## Docs to use

- [docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md) — patterns for new contributors.
- [SUPABASE.md](./SUPABASE.md) — hosted database.
- [SUMMARY.md](./SUMMARY.md) / [AUTHENTICATION.md](./AUTHENTICATION.md) — legacy; prefer README.

## Next (product / engineering)

- Expand test coverage and keep local DB workflow aligned with CI.
- Production: secrets, backups, HTTPS, optional Redis for shared cache if API is scaled horizontally.
- Long-term auth: evaluate httpOnly cookie sessions + CSRF if security review requires it.

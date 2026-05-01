# FireTrack / Inventory App

Multi-tenant SaaS for safety and first-aid service companies: jobs, inventory, service reports (PDF), payments, weather, and QuickBooks-oriented integrations.

## Status (April 2026)

| Area | State |
|------|--------|
| **Monorepo** | `backend/` (Express API), `frontend/` (React + Vite + Tailwind), optional `docker-compose` (Postgres + API + static UI) |
| **Database** | **PostgreSQL** with **Prisma** ([`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)); local Docker or hosted (see [SUPABASE.md](./SUPABASE.md)) |
| **Auth** | **JWT** — login, `/api/auth/me`, role-aware routes ([`backend/routes/auth.js`](backend/routes/auth.js), [`backend/middleware/auth.js`](backend/middleware/auth.js)) |
| **API** | Versioned **`/api/v1/*`** plus legacy **`/api/*`** mirrors; OpenAPI UI at **`/api/docs`** when the server is running |
| **Health** | **`GET /health`** — liveness + Prisma connectivity ([`backend/app.js`](backend/app.js)) |
| **Frontend** | SPA with **lazy-loaded routes**, dashboard, jobs, supplies, settings, Stripe checkout UI, barcode scan |
| **CI** | GitHub Actions: Postgres 16, `prisma migrate deploy`, backend tests, frontend production build ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) |
| **Tests** | **27** Jest tests under [`backend/__tests__/`](backend/__tests__/) (auth, jobs, supplies overview, PDF util). Same setup as CI: set `DATABASE_URL` / `DIRECT_URL`, run migrations, then `npm test` from `backend/`. |

**Onboarding:** [docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md) (fetch patterns, dashboard cache, scaling notes).

---

## Quick start

```bash
git clone <repo-url>
cd Inventory_app

# Root installs concurrently only; install each package
npm install
npm install --prefix backend
npm install --prefix frontend

# Backend env (Postgres URLs + JWT_SECRET + …)
cp backend/.env.sample backend/.env
# Edit backend/.env — see comments in .env.sample

# Database schema (local Postgres or Supabase)
cd backend && npx prisma migrate deploy && cd ..

# Optional: seed demo data
npm run seed --prefix backend

# API + Vite dev server (API default :5000, Vite default :5174)
npm run dev
```

- **API:** `http://localhost:5000` (or `PORT` in `backend/.env`)
- **SPA:** `http://localhost:5174` (or `VITE_DEV_PORT` in `frontend/.env`)
- **Swagger:** `http://localhost:5000/api/docs`

**Docker (Postgres + API + nginx frontend):** from repo root, `docker compose up --build` (see [`docker-compose.yml`](docker-compose.yml)).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| API | Node.js, Express, Prisma, JWT, Joi, Helmet, rate limiting (optional via env) |
| DB | PostgreSQL 16 (Docker / Supabase / any Prisma-compatible URL) |
| Frontend | React 18, Vite 5, Tailwind, React Router, Recharts, Stripe.js |
| Tests | Jest, Supertest (`backend/`) |
| Ops | Docker Compose, GitHub Actions CI |

---

## Frontend Performance Notes

`frontend/vite.config.js` includes two build-time performance controls:

- **Precompression:** outputs `.gz` and `.br` assets via `vite-plugin-compression` for compatible hosts/CDNs.
- **Manual vendor chunking:** separates stable framework code from heavier feature dependencies for better browser caching.

### Maintainer checklist (when adding frontend dependencies)

1. Add new heavy libs to the `manualChunks()` groups in `frontend/vite.config.js`.
2. Run `npm run build --prefix frontend` and compare chunk output sizes.
3. Prefer route/feature lazy loading for new heavy pages/components.
4. Keep chunk groups explicit; avoid over-splitting into many tiny chunks.

---

## API overview

Prefer **`/api/v1/...`**; **`/api/...`** is kept for backward compatibility.

| Prefix | Examples |
|--------|----------|
| Auth | `/api/v1/auth/login`, `.../me`, password reset flows |
| Core | companies, users, clients, locations, jobs, supplies |
| Product | dashboard, payments, weather, uploads |
| Integrations | QuickBooks-related routes under `/api/v1/integrations` |
| Webhooks | `/api/webhooks` (e.g. Stripe; mounted before JSON body parser) |

Full interactive docs: **`GET /api/docs`** on the running API.

---

## Project structure

```
Inventory_app/
├── backend/           # Express app, Prisma, services, tests
│   ├── prisma/
│   ├── routes/
│   ├── services/
│   └── __tests__/
├── frontend/          # Vite + React SPA
├── supabase/          # SQL migrations mirror (hosted Supabase workflow)
├── docs/              # DEVELOPER_ONBOARDING.md
├── docker-compose.yml
└── .github/workflows/ # ci.yml
```

---

## Testing

From repository root (after root `npm install` so `npm` can delegate):

```bash
npm test
```

Or explicitly:

```bash
cd backend
npx prisma migrate deploy   # requires DATABASE_URL
npm test                      # jest --forceExit
npm run test:watch
npm run test:coverage
```

CI uses a dedicated Postgres database `firetrack_test` and applies migrations before tests. If local runs fail with constraint errors, use a clean test DB or match CI env vars.

---

## Environment

All server configuration is documented in **[`backend/.env.sample`](backend/.env.sample)** (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`, Stripe, email, weather, optional Sentry, `DASHBOARD_CACHE_TTL_MS`, etc.).

Frontend samples: [`frontend/.env.sample`](frontend/.env.sample).

---

## Security (summary)

- Passwords hashed (bcrypt), JWT bearer auth, Joi validation, centralized errors, Helmet, optional rate limiting.
- SPA stores the JWT in **localStorage** (common for SPAs; see onboarding doc for XSS and long-term cookie-session tradeoffs).
- Production hardening (secrets management, backups, HTTPS termination) is deployment-specific.

---

## Documentation

| Document | Notes |
|----------|--------|
| [AUDIT.md](./AUDIT.md) | **Current** — full project audit with prioritised fixes (security, perf, testing, a11y, architecture, DevOps, docs) |
| [docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md) | Patterns: data fetching, abort controllers, dashboard cache, auth notes |
| [SECURITY.md](./SECURITY.md) | Current security model + known gaps (pointers into `AUDIT.md §2`) |
| [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) | SLO targets, how to measure, regression prevention |
| [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md) | WCAG 2.2 AA baseline, required patterns, tooling |
| [docs/adr/](./docs/adr/) | Architecture decision records (Prisma, JWT, Supabase) |
| [SUPABASE.md](./SUPABASE.md) | Hosted Postgres setup |
| [COMMIT_GUIDE.md](./COMMIT_GUIDE.md) | Commit conventions |
| [QUICKREF.md](./QUICKREF.md) | Command cheat sheet |
| [STATUS.md](./STATUS.md) | Short project snapshot (kept in sync with this README) |
| [SUMMARY.md](./SUMMARY.md), [AUTHENTICATION.md](./AUTHENTICATION.md) | **Historical** — pre-Prisma / early roadmap; trust README + onboarding doc instead |

---

## Contributing

1. Branch from `main` / `master`.
2. Run backend tests (with migrated DB) and `npm run build --prefix frontend` when you touch the UI.
3. Open a PR; CI must pass.

---

## License

MIT

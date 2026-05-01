# Quick reference

Command and path cheat sheet. See `README.md` for the fuller walkthrough.

---

## Stack in one line

Node 20 + Express + Prisma + PostgreSQL, React 18 + Vite 5 + Tailwind, JWT auth, Jest + Supertest, Docker Compose, GitHub Actions CI.

---

## Setup

```bash
git clone <repo-url>
cd Inventory_app

npm install                          # root (concurrently)
npm install --prefix backend
npm install --prefix frontend

cp backend/.env.sample backend/.env  # fill in DATABASE_URL, JWT_SECRET, ...
cp frontend/.env.sample frontend/.env

cd backend && npx prisma migrate deploy && cd ..
npm run seed --prefix backend        # optional demo data
```

---

## Run

```bash
npm run dev                          # API :5000 + Vite :5174

docker compose up --build            # full stack in containers
```

- API: `http://localhost:5000`
- SPA: `http://localhost:5174`
- Swagger UI: `http://localhost:5000/api/docs`
- Health: `http://localhost:5000/health`

---

## Test

```bash
cd backend
npx prisma migrate deploy            # uses DATABASE_URL
npm test                             # Jest + Supertest
npm run test:watch
npm run test:coverage
```

CI uses Postgres 16 with a dedicated `firetrack_test` DB. There is currently no frontend test suite.

---

## Common tasks

```bash
npx prisma migrate dev --name <slug> # create + apply a dev migration
npx prisma studio                    # inspect the database
npm run build --prefix frontend      # production SPA build
npm audit --omit=dev                 # review dependency CVEs
```

---

## Where things live

| What | Path |
|------|------|
| API entry | `backend/server.js` → `backend/app.js` |
| Routes | `backend/routes/*.js` |
| Services (business logic) | `backend/services/*.js` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Middleware (auth, validation, errors) | `backend/middleware/*.js` |
| Jest tests | `backend/__tests__/**` |
| SPA entry | `frontend/src/main.jsx`, `frontend/src/App.jsx` |
| Pages | `frontend/src/pages/*.jsx` |
| Shared components | `frontend/src/components/` |
| API client | `frontend/src/services/api.js` |
| Auth context | `frontend/src/context/AuthContext.jsx` |
| CI | `.github/workflows/ci.yml` |
| Docker | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |

---

## API surface

Prefer `/api/v1/*`. Legacy `/api/*` mirrors remain for backwards compatibility and are slated for deprecation (see `AUDIT.md §2.4`).

```
/api/v1/auth            login, me, password reset
/api/v1/companies       company CRUD (admin)
/api/v1/users           user CRUD (admin)
/api/v1/clients         client CRUD
/api/v1/locations       location / station CRUD
/api/v1/jobs            job CRUD, /:id/complete (PDF + email)
/api/v1/supplies        catalog, inventory, imports
/api/v1/dashboard       summary + charts (cached in-process)
/api/v1/payments        Stripe checkout + billing
/api/v1/weather         forecast + insights
/api/v1/integrations    QuickBooks
/api/webhooks           Stripe webhook (mounted pre-JSON-parse)
```

Full interactive docs: `GET /api/docs` (in dev always, in prod only when `ENABLE_API_DOCS=true`).

---

## Git

```bash
git checkout -b feat/<short-description>
git commit -m "feat: <what and why>"   # see COMMIT_GUIDE.md
git push -u origin HEAD
```

CI must pass before merge. Branch is `main`.

---

## When stuck

1. `npm test -- --verbose` — read the failure, not the last console line.
2. Check `backend/.env` — `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` are the usual culprits.
3. `curl http://localhost:5000/health` — is the DB reachable?
4. Read `AUDIT.md` — known gaps and planned fixes live there.
5. Read `docs/DEVELOPER_ONBOARDING.md` — patterns for `useEffect`, abort controllers, the dashboard cache.

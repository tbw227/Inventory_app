# Security model

Current state, design choices, and known gaps. For the prioritised gap list with fixes, see [`AUDIT.md §2`](./AUDIT.md).

---

## What is in place today

### Transport and headers
- **Helmet** is mounted with a Content Security Policy that differs between production (strict) and development (allows `unsafe-eval` for Vite HMR). See `backend/app.js`.
- **CORS** whitelist from `FRONTEND_URL` (comma-separated); production startup fails if `FRONTEND_URL` is empty. Origins without a header (curl, server-to-server) are **not** allowed through. `credentials: true`.
- HTTPS is terminated by whichever host runs the nginx image (`frontend/nginx.conf`) or upstream load balancer.

### Authentication
- **JWT bearer tokens** signed with HS256, 8 h lifetime, required `JWT_SECRET` (`backend/utils/auth.js`, `backend/middleware/auth.js`).
- **bcryptjs** with 12 salt rounds for password storage.
- `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` (`backend/routes/auth.js`).
- SPA stores the token in `localStorage` (`frontend/src/context/AuthContext.jsx`). This is explicit and documented here; see §"Known gaps" below.

### Authorisation
- `authorize(...roles)` middleware enforces role on mutating routes. Roles: `admin`, `technician`, `user`.
- Tenant isolation: every business record carries a `companyId`; services always filter by `req.user.companyId`.
- Subscription enforcement: `SUBSCRIPTION_ENFORCE` toggle in `backend/middleware/auth.js` blocks `canceled`, `past_due`, and `incomplete` billing states on protected routes.

### Input handling
- **Joi** schemas in `backend/middleware/validation.js` with `stripUnknown: true`, `abortEarly: false`. Every mutating route on `users`, `companies`, `clients`, `locations`, `jobs`, `payments`, and supply imports is validated.
- Prisma is used for all DB access; raw SQL is only used in a handful of read-only reporting queries, always with tagged-template parameters (`backend/services/dashboardService.js`, `paymentService.js`).
- File uploads go through `multer` with size and MIME filtering (`backend/routes/upload.js`).

### Rate limiting
- Global limiter with env-configurable window / max (`backend/app.js`), defaulting to 15 min / 100 requests per IP.
- Stricter per-route limiters on `/login`, `/forgot-password`, `/reset-password` (`backend/routes/auth.js`). `skipSuccessfulRequests: true` on login so a successful user is not throttled behind a brute-force attempt from the same NAT.

### Error handling and logging
- Central error handler (`backend/middleware/errorHandler.js`): generic 500 message in production, full detail only in development. 5xx is routed through winston.
- **winston** structured JSON in production, silent in test (`backend/config/logger.js`).
- **Sentry** initialised when `SENTRY_DSN` is set (`backend/config/sentry.js`); 10 % trace sample. Placement note: see [`AUDIT.md §2.6`](./AUDIT.md).

### Secrets
- No secrets in the repo; `.env` is gitignored and `backend/.env.sample` documents every variable.
- Stripe / Supabase keys read from env at runtime (`backend/config/stripe.js`, `frontend/src/lib/supabaseClient.js` — anon key only, which is public by design).

---

## Design choices (ADRs)

- Stateless JWT: see [`docs/adr/0002-jwt-stateless.md`](./docs/adr/0002-jwt-stateless.md).
- Supabase anon key in the client is intentional; it is scoped by Row Level Security. If RLS is ever disabled, re-evaluate.
- CSP allows `'unsafe-eval'` only in non-production to unblock Vite HMR; production CSP is strict.

---

## Known gaps (owned by `AUDIT.md`)

The following are tracked in the audit doc; when they land, update this page.

- **JWT revocation** — no `jti`, no denylist, no refresh token. 8 h exposure window if a token leaks. (`AUDIT.md §2.2`)
- **Token storage** — `localStorage`. Any XSS on the origin exfiltrates the session. The planned move is memory-only access token + `httpOnly` refresh cookie. (`AUDIT.md §2.5`)
- **`/health` is public** and hits the DB. Should be split into `liveness` (no DB) and `readiness` (DB, internal only). (`AUDIT.md §2.3`)
- **Legacy `/api/*`** has no `Deprecation` / `Sunset` headers. (`AUDIT.md §2.4`)
- **Seed script** logs demo credentials (`AUDIT.md §2.1`).
- **Swagger** has no per-route `@openapi` annotations (`AUDIT.md §2.7`).

---

## Operational practices

- **Before a release** — run `npm audit --omit=dev --audit-level=high` in both `backend/` and `frontend/`.
- **Quarterly** — rotate `JWT_SECRET` (invalidates all sessions — communicate downtime), review role assignments, run `git log --all -p -S"BEGIN RSA"` (or similar) to confirm no secret has entered history.
- **On any security report** — open a private issue, do not discuss in public PRs. Patch on a branch, run tests, release, then post a summary.

---

## Questions

- Where are passwords validated? `backend/middleware/validation.js` (minimum length + complexity) and `backend/utils/auth.js` (hashing only).
- Where is the auth middleware? `backend/middleware/auth.js`. Every protected route uses `requireAuth` and, where needed, `authorize(...)`.
- Does the SPA hit the API cross-origin? In development yes (`http://localhost:5174` → `http://localhost:5000`); CORS whitelist must include the dev origin. In production the SPA and API sit behind the same nginx, so it is same-origin.

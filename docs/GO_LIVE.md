# Go-live checklist (users & clients)

Use this before inviting real companies. Stack: **Vercel** (SPA) + **Railway** (API) + **Supabase** (Postgres).

Deploy wiring: [`DEPLOY_API.md`](./DEPLOY_API.md), [`RAILWAY.md`](./RAILWAY.md).

---

## Phase 1 — Infrastructure (do first)

### Railway (API)

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | New random 32+ chars (never reuse dev secret) |
| `DATABASE_URL` | Supabase **session pooler** + `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase **direct** host (migrations on `npm start`) |
| `FRONTEND_URL` | Exact Vercel app URL(s), comma-separated if multiple |
| `DASHBOARD_DEMO_REVENUE` | `false` (or unset — defaults off in production) |
| `SUBSCRIPTION_ENFORCE` | `true` once Stripe billing is live |
| `ALLOW_PUBLIC_REGISTRATION` | `true` only if marketing signup is intentional |
| `ENABLE_API_DOCS` | `false` (Swagger off in prod unless you need it) |
| `CLERK_SECRET_KEY` | Clerk **secret** key (when using Clerk auth) |
| `CLERK_PUBLISHABLE_KEY` | Same **publishable** key as Vercel `VITE_CLERK_PUBLISHABLE_KEY` |

When both Clerk keys are set, **password login/register are disabled** on the API. Existing users must sign in through Clerk using the **same email** — the API auto-links `clerk_user_id` on first sign-in.

Optional but recommended:

| Variable | Purpose |
|----------|---------|
| `SENTRY_DSN` | Error alerts |
| `STRIPE_*` | Live keys + webhook secret + price IDs |
| `EMAIL_*` | Password reset emails |
| `REDIS_URL` | Required if Railway runs **more than one** API replica |

Verify:

```text
GET https://YOUR-SERVICE.up.railway.app/health/live
GET https://YOUR-SERVICE.up.railway.app/health          → database: connected
```

### Vercel (frontend)

| Variable | Production value |
|----------|------------------|
| `VITE_API_URL` | `https://YOUR-SERVICE.up.railway.app` (no `/api/v1`) |
| `VITE_ALLOW_PUBLIC_REGISTRATION` | Match backend intent |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (enables Clerk-only sign-in UI) |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_live_…` when billing is live |

**Redeploy** after any `VITE_*` change (build-time).

### Supabase

- [ ] Run `npx prisma migrate deploy` against production (also runs on Railway start).
- [ ] Enable **Point-in-Time Recovery** / backups on paid plan.
- [ ] **Do not** run `npm run seed` on production with default passwords (see `backend/seed.js`).

---

## Phase 2 — Product & billing

- [ ] Stripe **live** mode: secret key, webhook endpoint `https://YOUR-SERVICE.up.railway.app/api/webhooks/stripe` (confirm path in [`backend/routes`](../backend/routes)).
- [ ] Test checkout + webhook updates `subscription_status` on a test company.
- [ ] Turn on `SUBSCRIPTION_ENFORCE=true` after webhooks work.
- [ ] Confirm demo revenue is off (`DASHBOARD_DEMO_REVENUE=false`).
- [ ] Password reset: configure `EMAIL_*` and test forgot-password flow end-to-end.

---

## Phase 3 — Smoke test (real browser)

Run as a new or seeded **admin**, then **technician**:

| Flow | Pass? |
|------|-------|
| Login / logout | |
| Dashboard loads (no fake revenue if demo off) | |
| Create client + location | |
| Create job, assign tech, complete job | |
| Inventory overview + adjust quantity | |
| Upload job photo or profile avatar | |
| Download / view service report PDF | |
| Settings: company profile, invite user (if applicable) | |
| Stripe subscription or one-off payment (if enabled) | |

**Photos:** With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on Railway, uploads persist in Supabase Storage (`{company_id}/…`). Without them, photos use container disk and are lost on redeploy.

---

## Phase 4 — Security & compliance (before scale)

- [ ] Unique `JWT_SECRET` per environment; rotate if ever leaked.
- [ ] Review [`SECURITY.md`](../SECURITY.md) known gaps (JWT in `localStorage`, no token revocation).
- [ ] No secrets in git; `.env` only local.
- [ ] Rate limits acceptable for your traffic (`RATE_LIMIT_*` in `backend/.env.sample`).
- [ ] Privacy/terms pages on marketing site if required for your jurisdiction.

---

## Phase 5 — Engineering quality (parallel / post-launch)

Tracked in [`AUDIT.md`](../AUDIT.md) roadmap:

| Priority | Item |
|----------|------|
| Now | CI `npm audit`, Dependabot, keep backend tests green |
| Soon | Frontend smoke tests (Vitest + login/dashboard) |
| Later | JWT `jti` + denylist; httpOnly refresh cookies |
| Later | Durable object storage for uploads |
| Later | Playwright E2E for critical paths |

---

## Phase 6 — First client onboarding

1. Create company (signup or admin provisioning).
2. Admin sets company profile, Stripe subscription if applicable.
3. Add locations, clients, catalog / supplies.
4. Invite technicians; confirm role permissions (jobs vs inventory).
5. Run one real job through completion + PDF for their sign-off.

---

## Quick troubleshooting

| Symptom | Check |
|---------|--------|
| CORS error | `FRONTEND_URL` exact match to browser origin |
| API 404 from Vercel | `VITE_API_URL` + frontend redeploy |
| 502 on Railway | Remove fixed target port 5000; check deploy logs |
| Images broken after deploy | Ephemeral disk — migrate to object storage |
| Login works locally, not prod | CORS + `JWT_SECRET` + pooler `DATABASE_URL` |

---

## Ownership

| Area | Doc |
|------|-----|
| Deploy | `DEPLOY_API.md`, `RAILWAY.md` |
| Security | `SECURITY.md`, `AUDIT.md` |
| Database | `SUPABASE.md` |
| Auth model | `AUTHENTICATION.md` |

Update this checklist when launch requirements change.

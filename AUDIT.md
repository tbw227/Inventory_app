# Project Audit

_Monorepo: FireTrack (Express + Prisma + Postgres, React + Vite + Tailwind)_  
_Audit date: Apr 25, 2026_  
_Scope: security, performance, testing, accessibility, architecture, DevOps, documentation_

---

## 1. Executive summary

The codebase has improved materially since the previous pass: nginx now serves precompressed bundles, uploaded images are optimized via Sharp, read-heavy endpoints use revalidation cache headers, and the documentation baseline is stronger (`QUICKREF.md`, `SECURITY.md`, `docs/PERFORMANCE.md`, `docs/ACCESSIBILITY.md`, ADRs).  
The largest remaining risks are now concentrated in auth/session hardening and delivery quality gates (tests/CI lint/security automation), not in the core architecture.

### Severity counts
- **Critical:** 0
- **High:** 5
- **Medium:** 9
- **Low:** 6

### Scorecard (A–F)
- **Security — B-.** Strong baseline controls, but token revocation and `/health` hardening are still open.
- **Performance — B+.** Compression + caching + image optimization are in; remaining bottlenecks are oversized page files and no bundle budget gate.
- **Testing — D+.** Backend route coverage exists and passes in CI; frontend still has zero automated tests.
- **Accessibility — C+.** Better than baseline, but reusable loading/error primitives remain unused and no automated a11y checks exist.
- **Architecture — B.** Good hooks/services split; UI files are still too large in key pages.
- **DevOps / CI-CD — C.** CI runs backend tests and frontend build; still missing lint, audit, frontend tests, and dependency automation.
- **Documentation — B.** Core docs are now coherent and practical; some operational references (OpenAPI route annotations, release runbooks) are still thin.

---

## 2. Security

### Finding: Seed script logs plaintext credentials  
- **Severity**: High  
- **Evidence**:
```110:113:backend/seed.js
  console.log('Seed data inserted');
  console.log(`  Shop catalog: ${FIRST_AID_CATALOG_LINE_COUNT} supplies (on-hand starts at 0; station inventory cleared)`);
  console.log('  Admin: alice@example.com / Admin123!');
  console.log('  Tech:  bob@example.com / Tech123!');
```
- **Why it matters**: Build/deploy logs are often centralized; plaintext credentials in logs are an avoidable secret leak.
- **Fix**:
  1. Read seeded passwords from env vars only.
  2. Print usernames/emails only (never passwords).
  3. Fail seed in non-dev if default/demo passwords are detected.

### Finding: JWT access token has no revocation handle (`jti`)  
- **Severity**: High  
- **Evidence**:
```23:25:backend/utils/auth.js
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}
```
- **Why it matters**: Token theft remains valid until expiry; admins cannot invalidate a specific active token immediately.
- **Fix**:
  1. Add `jti` claim to issued tokens.
  2. Check denylist (in-memory now, Redis-ready later) in auth middleware.
  3. Move to short-lived access + refresh cookie flow.

### Finding: `/health` is public and executes DB query  
- **Severity**: Medium  
- **Evidence**:
```168:173:backend/app.js
app.get('/health', async (req, res) => {
  let database = 'unknown';
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
```
- **Why it matters**: External polling can generate unnecessary DB load and exposes service internals.
- **Fix**:
  1. Split `liveness` (no DB) and `readiness` (DB check).
  2. Gate readiness endpoint via internal network or secret header.
  3. Keep response body minimal in production.

### Finding: Legacy `/api/*` endpoints remain active without deprecation headers  
- **Severity**: Medium  
- **Evidence**:
```154:163:backend/app.js
// Legacy unversioned routes (backwards compatible)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
...
app.use('/api/integrations', require('./routes/integrations'));
```
- **Why it matters**: Parallel API surfaces increase maintenance and security review surface.
- **Fix**:
  1. Add `Deprecation` + `Sunset` headers on legacy routes.
  2. Log usage by user agent/client id.
  3. Publish removal date and remove dead traffic paths.

### Finding: SPA tokens stored in `localStorage`  
- **Severity**: Medium  
- **Evidence**:
```15:16:frontend/src/context/AuthContext.jsx
  useEffect(() => {
    const token = localStorage.getItem('token')
```
- **Why it matters**: Any successful XSS can exfiltrate durable auth tokens.
- **Fix**:
  1. Move access token to memory.
  2. Store refresh token in `httpOnly` cookie with CSRF protections.
  3. Keep CSP strict and dependency auditing active.

### Finding: Sentry initialized late in middleware chain  
- **Severity**: Low  
- **Evidence**:
```193:196:backend/app.js
const { initSentry } = require('./config/sentry');
initSentry(app);

app.use(errorHandler);
```
- **Why it matters**: Request tracing and middleware context can be incomplete when initialized after routing.
- **Fix**:
  1. Mount Sentry request handler before routes.
  2. Mount Sentry error handler immediately before global error handler.

---

## 3. Performance

### Finding: Large page modules still dominate parse/execute cost  
- **Severity**: Medium  
- **Evidence**:
```text
frontend/src/pages/Supplies.jsx -> 1532 lines
frontend/src/pages/Settings.jsx -> 704 lines
frontend/src/pages/Locations.jsx -> 648 lines
```
- **Why it matters**: Even with lazy loading, these routes have heavier hydration/parsing and slower iteration velocity.
- **Fix**:
  1. Split `Supplies.jsx` into table/actions/modal modules.
  2. Split `Settings.jsx` sections into route-level subpanels.
  3. Add per-route performance budgets.

### Finding: No bundle-size guard in CI  
- **Severity**: Medium  
- **Evidence**:
```50:67:.github/workflows/ci.yml
frontend-build:
  runs-on: ubuntu-latest
  ...
  - name: Build frontend
    working-directory: frontend
    run: npm run build
```
- **Why it matters**: Regressions in shipped JS can land silently.
- **Fix**:
  1. Add bundle budget step (`size-limit` or custom script).
  2. Fail PRs exceeding agreed gzip/brotli thresholds.

### Finding: Query observability is still limited  
- **Severity**: Low  
- **Evidence**:
```1:3:backend/services/dashboardService.js
const { Prisma, JobStatus } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { createInMemoryCache } = require('../lib/cache');
```
- **Why it matters**: Slow query hotspots are hard to detect without instrumentation.
- **Fix**:
  1. Enable Prisma query events in production with threshold logging.
  2. Emit slow queries to Sentry/winston with endpoint context.

### Finding: Fixed in this cycle — static compression and image pipeline  
- **Severity**: Low (resolved)  
- **Evidence**:
```5:9:frontend/nginx.conf
gzip_static on;
brotli on;
brotli_static on;
brotli_comp_level 5;
brotli_types text/plain text/css application/javascript application/json application/xml+rss image/svg+xml;
```
```27:49:backend/routes/upload.js
const finalBuffer = alreadyOptimizedWebp
  ? sourceBuffer
  : await sharp(sourceBuffer, { animated: true })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
```
- **Why it matters**: This materially reduces transfer size and repeat-load overhead.
- **Fix**: Keep and monitor with regression tests/budgets.

---

## 4. Testing

### Finding: Frontend has zero automated tests  
- **Severity**: High  
- **Evidence**:
```6:10:frontend/package.json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```
- **Why it matters**: UI regressions and accessibility regressions are currently caught late (manual only).
- **Fix**:
  1. Add Vitest + RTL baseline.
  2. Add route smoke tests (dashboard, supplies, jobs, login).
  3. Add Playwright smoke E2E for 3 critical flows.

### Finding: Backend test suite is route-heavy, service-light  
- **Severity**: Medium  
- **Evidence**:
```text
Backend test files: auth.test.js, jobs.test.js, supplies.overview.test.js, utils/generatePdf.test.js
```
- **Why it matters**: Complex service logic (dashboard analytics, imports, billing) lacks direct unit-level confidence.
- **Fix**:
  1. Add service-level unit tests for dashboard and supply import paths.
  2. Enforce coverage thresholds by directory.

### Finding: CI does not collect or enforce coverage  
- **Severity**: Medium  
- **Evidence**:
```46:48:.github/workflows/ci.yml
- name: Run backend tests
  working-directory: backend
  run: npm test
```
- **Why it matters**: Coverage can silently decline over time.
- **Fix**:
  1. Switch CI run to `npm run test:coverage`.
  2. Upload coverage artifact and fail below threshold.

---

## 5. Accessibility

### Finding: Shared `Spinner` and `ErrorMessage` remain unused  
- **Severity**: Medium  
- **Evidence**:
```text
frontend/src/components/ui/Spinner.jsx exists, but no import sites found.
frontend/src/components/ui/ErrorMessage.jsx exists, but no import sites found.
```
- **Why it matters**: Inconsistent loading/error semantics increase a11y drift.
- **Fix**:
  1. Standardize on shared primitives across pages.
  2. Ensure `role=status/alert` and `aria-live` are built in.

### Finding: No automated accessibility checks in CI  
- **Severity**: Medium  
- **Evidence**:
```1:68:.github/workflows/ci.yml
# only backend tests + frontend build jobs
```
- **Why it matters**: Accessibility regressions are likely to recur without automation.
- **Fix**:
  1. Add axe checks in component tests.
  2. Add Lighthouse accessibility score gate on key routes.

### Finding: Baseline docs exist (improvement) but enforcement is manual  
- **Severity**: Low  
- **Evidence**:
```text
docs/ACCESSIBILITY.md present
```
- **Why it matters**: Documentation helps, but enforcement requires CI checks and shared components.
- **Fix**: Pair docs with test/lint gates.

---

## 6. Architecture & code quality

### Finding: Tailwind token layer is still empty  
- **Severity**: Medium  
- **Evidence**:
```1:6:frontend/tailwind.config.cjs
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
```
- **Why it matters**: Color/spacing semantics remain scattered and hard to evolve consistently.
- **Fix**:
  1. Add semantic tokens in `theme.extend`.
  2. Migrate high-churn screens first.

### Finding: View-layer complexity remains concentrated in `Supplies.jsx`  
- **Severity**: Medium  
- **Evidence**:
```text
frontend/src/pages/Supplies.jsx -> 1532 lines
```
- **Why it matters**: Single-file complexity increases defect risk and review friction.
- **Fix**:
  1. Extract inventory table, import wizard, and export actions into separate components/hooks.

### Finding: No soft-delete pattern in core Prisma models  
- **Severity**: Low  
- **Evidence**:
```text
No deletedAt fields in active core models (Job/Client/Supply/Location) in backend/prisma/schema.prisma
```
- **Why it matters**: Auditability and reversible deletion workflows are limited.
- **Fix**:
  1. Decide policy (hard delete vs soft delete) explicitly.
  2. Implement consistently if soft-delete is chosen.

---

## 7. DevOps / CI-CD

### Finding: CI lacks lint/security/dependency automation  
- **Severity**: High  
- **Evidence**:
```9:68:.github/workflows/ci.yml
jobs:
  backend-test:
  frontend-build:
```
```text
.github/dependabot.yml -> not present
```
- **Why it matters**: Style drift, vulnerable packages, and stale dependencies can accumulate unnoticed.
- **Fix**:
  1. Add lint job (frontend + backend).
  2. Add `npm audit --omit=dev --audit-level=high`.
  3. Add Dependabot config for root/backend/frontend.

### Finding: Docker compose startup ordering still lacks health-gated dependencies  
- **Severity**: Medium  
- **Evidence**:
```21:23:docker-compose.yml
depends_on:
  - postgres
```
- **Why it matters**: App may attempt DB work before DB readiness.
- **Fix**:
  1. Add healthchecks and `condition: service_healthy`.

### Finding: Frontend production image now properly supports brotli static delivery (improvement)  
- **Severity**: Low (resolved)  
- **Evidence**:
```11:13:frontend/Dockerfile
FROM fholzer/nginx-brotli:latest
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
- **Why it matters**: Confirms the compression optimization is deployable, not only local.
- **Fix**: Pin the image digest/version to reduce supply-chain drift.

---

## 8. Documentation

### Finding: Core operational docs are now present and aligned (improvement)  
- **Severity**: Low (resolved)  
- **Evidence**:
```text
QUICKREF.md rewritten for Prisma/JWT stack.
docs/PERFORMANCE.md present.
docs/ACCESSIBILITY.md present.
docs/adr/0001-prisma.md, 0002-jwt-stateless.md, 0003-supabase.md present.
```
- **Why it matters**: Onboarding and architecture reasoning are clearer than prior state.
- **Fix**: Keep docs tied to release checklists.

### Finding: API reference depth is still limited without route-level OpenAPI annotations  
- **Severity**: Medium  
- **Evidence**:
```text
No @openapi annotations found in backend/routes/*
```
- **Why it matters**: `/api/docs` exists but does not fully document request/response schemas per endpoint.
- **Fix**:
  1. Add OpenAPI annotations for top routes first (`auth`, `jobs`, `supplies`).

---

## 9. Findings index

- **High (5)**: Seed credential logging; JWT revocation gap; no frontend tests; CI missing lint/security/dependency automation; localStorage token model risk.
- **Medium (9)**: Public DB-backed health endpoint; legacy API dual surface; backend service-level test gap; no coverage gates; a11y automation gap; empty Tailwind token layer; oversized page modules; compose readiness gaps; sparse OpenAPI route docs.
- **Low (6)**: Late Sentry setup; limited query observability; unresolved soft-delete policy; shared UI primitives unused; docs enforcement still manual; image/compression improvements need regression guards.

---

## 10. 30 / 60 / 90 day roadmap

Each item is scoped to <= 1 dev-day.

### Days 0–30 (highest ROI)
1. Stop plaintext seed credential logging (`backend/seed.js`).
2. Add CI lint jobs for backend/frontend.
3. Add `npm audit --omit=dev --audit-level=high` in CI.
4. Add `.github/dependabot.yml`.
5. Add frontend bundle budget gate.
6. Split `/health` into liveness/readiness with readiness gate.
7. Add compose healthchecks + `service_healthy`.
8. Add backend coverage run and threshold check.

### Days 31–60 (stabilization)
1. Add Vitest + RTL with dashboard/jobs/supplies/login smoke tests.
2. Add axe checks to frontend tests.
3. Add route-level OpenAPI docs for `auth`, `jobs`, `supplies`.
4. Refactor `Supplies.jsx` into subcomponents/hooks.
5. Add semantic Tailwind tokens and migrate top 3 pages.
6. Add Prisma slow-query threshold logging.

### Days 61–90 (strategic hardening)
1. Add JWT `jti` and token denylist checks.
2. Move to short-lived access + refresh-cookie flow.
3. Add Playwright smoke E2E for login/job/supplies export paths.
4. Finalize delete policy (soft-delete vs hard-delete) and implement.
5. Add release checklist step requiring docs updates for changed subsystems.

---

## 11. Appendix

### Methodology
Static, source-based audit with targeted runtime checks already captured in repository test/build outputs. No external scanners were run during this pass.

### Files inspected (principal)
- Backend: `backend/app.js`, `backend/seed.js`, `backend/utils/auth.js`, `backend/routes/upload.js`, `backend/routes/uploads.js`, `backend/middleware/validation.js`, `backend/services/dashboardService.js`, route/controller/service modules.
- Frontend: `frontend/nginx.conf`, `frontend/Dockerfile`, `frontend/src/context/AuthContext.jsx`, `frontend/src/pages/*`, `frontend/src/components/*`, `frontend/tailwind.config.cjs`.
- Ops/docs: `.github/workflows/ci.yml`, `docker-compose.yml`, `README.md`, `QUICKREF.md`, `SECURITY.md`, `docs/DEVELOPER_ONBOARDING.md`, `docs/PERFORMANCE.md`, `docs/ACCESSIBILITY.md`, `docs/adr/*`.

### Tools used
- Repository file reads (`ReadFile`)
- Pattern scans (`rg`, `Glob`)
- Build/test verification via shell where relevant

### Re-run guidance
- Re-run this audit monthly or after major architecture/security changes.
- Add automated checklists so this document becomes a delta log, not a full rediscovery each cycle.

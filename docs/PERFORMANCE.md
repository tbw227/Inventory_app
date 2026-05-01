# Performance baseline

Targets, current state, and how to avoid regressions. Gaps are tracked in [`AUDIT.md §3`](../AUDIT.md).

---

## Service-level targets (SLO)

These are not contractual; they are the numbers we design against.

| Metric | Target | Applies to |
|--------|--------|------------|
| API p50 latency (authenticated) | < 150 ms | `/api/v1/*` except heavy reports |
| API p95 latency (authenticated) | < 500 ms | same |
| Dashboard summary p95 | < 250 ms | `/api/v1/dashboard` (cached) |
| SPA Time to Interactive (4G emulation, cold) | < 3.0 s | dashboard on login |
| SPA Largest Contentful Paint | < 2.5 s | dashboard on login |
| JS transferred to first paint | < 250 KB gzipped | login + dashboard combined |
| PDF generation (single report) | < 1.5 s | `POST /api/v1/jobs/:id/complete` |

If any target is missed after a release, open an issue and link it to the commit that introduced the regression.

---

## What is in place

### Backend
- In-process cache for `GET /api/v1/dashboard`, TTL via `DASHBOARD_CACHE_TTL_MS` (`backend/services/dashboardService.js`). Abstracted through `backend/lib/cache.js` (Map today, Redis-ready interface).
- Prisma indexes on every foreign key plus composite `[companyId, assignedUserId, scheduledDate]` on `Job` (`backend/prisma/schema.prisma`).
- Read-heavy reporting queries use `prisma.$queryRaw` with parameterised tagged templates to avoid ORM overhead, not to bypass safety.

### Frontend
- Route-level `React.lazy` in `frontend/src/App.jsx` for every page.
- Manual vendor chunks in `frontend/vite.config.js`:
  - `vendor-react` — `react`, `react-dom`, `react-router-dom`
  - `vendor-charts` — `recharts`
  - `vendor-scan` — `@zxing/browser`, `jsbarcode`
  - `vendor-integrations` — `@stripe/*`, `@supabase/*`
- **Precompressed assets** (`.gz` + `.br`) emitted by `vite-plugin-compression`.
- ⚠️ **Nginx currently serves uncompressed bundles.** The `.br` and `.gz` files are on disk but `gzip_static` / `brotli_static` are not enabled in `frontend/nginx.conf`. Fix is tracked in `AUDIT.md §3.1` and is the single highest-ROI perf change available.

---

## How to measure (locally)

### Backend
```bash
cd backend
npm run dev                          # local API
# Use curl or k6. Example: 50 concurrent dashboard calls
npx autocannon -c 50 -d 20 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/dashboard
```
Record p50, p95, p99. Compare to the SLO table.

### Frontend
```bash
cd frontend
npm run build
npm run preview                      # production build, :4173 by default
```
Then run Lighthouse in Chrome (mobile, "Slow 4G"). Record LCP, TTI, total JS transferred.

### Bundle breakdown
```bash
cd frontend
npm run build
# inspect dist/assets/*.js file sizes
```
Largest 10 chunks should be stable release-over-release. Any chunk breaching 250 KB gzipped needs justification.

---

## Regression prevention

### Now (manual)
- Before merging a PR that touches `frontend/package.json`, run a local build and note the top-10 chunk sizes in the PR description.
- Before merging a PR that touches `backend/services/` or `backend/prisma/schema.prisma`, run the autocannon test above if the change is in a hot path.

### Planned (CI — see `AUDIT.md §3.3`)
- `size-limit` job that fails the build if `index-*.js` gzipped grows beyond 250 KB.
- Lighthouse CI against `npm run preview` on PRs touching `frontend/src/`.
- Prisma slow-query logging routed to winston in production; alerts on any query > 200 ms (`AUDIT.md §3.4`).

---

## Known hot spots

- `frontend/src/pages/Supplies.jsx` — ~1,300 lines, 3 heavy modal components inline. First-visit to `/supplies` pulls an outsized chunk. Split in `AUDIT.md §3.2`.
- `GET /api/v1/weather/*` — external API calls with in-process cache; cold start after deploy is slow until cache warms.
- PDF generation uses a synchronous layout step; a background queue is out of scope until we have user-visible complaints.

---

## Changelog of material perf changes

- **Apr 2026** — introduced `vite-plugin-compression` and manual vendor chunking (`vite.config.js`). See README "Frontend Performance Notes".
- **Apr 2026** — added composite `Job` index `[companyId, assignedUserId, scheduledDate]`.
- **Apr 2026** — introduced `backend/lib/cache.js` as a pre-Redis abstraction.

When you land a change that moves an SLO metric by > 10 %, add a dated entry here with the commit SHA and the measured delta.

# Developer onboarding

Short reference for patterns used in this repo so new contributors can ship safely without guessing.

## Frontend: data fetching in React

### Do not make `useEffect` itself `async`

`useEffect` must return nothing or a cleanup function, not a Promise. Run async work inside an immediately invoked async function (or a named `async function` inside the effect).

### Cancel requests with `AbortController`

When the user navigates away or dependencies change, abort in-flight HTTP calls so late responses do not overwrite newer state.

- Create `const controller = new AbortController()`.
- Pass `{ signal: controller.signal }` to axios (`api.get(url, { signal })`).
- Return `() => controller.abort()` from the effect.

See [`frontend/src/context/AuthContext.jsx`](../frontend/src/context/AuthContext.jsx) (session bootstrap) and [`frontend/src/pages/Dashboard.new.jsx`](../frontend/src/pages/Dashboard.new.jsx) (dashboard + calendar). The `.new.jsx` suffix is transitional; a rename back to `Dashboard.jsx` is tracked in `AUDIT.md §8.2`.

### Treat aborts as non-errors

Aborted requests reject with `ERR_CANCELED` / `CanceledError`. Use [`frontend/src/utils/isAbortError.js`](../frontend/src/utils/isAbortError.js) in `catch` so you do not clear auth, show error toasts, or log noise for a normal cancellation.

### `exhaustive-deps` vs values you must not list

If an effect should run only when `chartDays` changes but needs to know “do we already have dashboard data?” (for a silent refresh vs first load), **do not** add `data` to the dependency array (that would refetch every time data updates).

**Pattern:** keep `data` out of deps and read the latest value via a ref updated every render:

```javascript
const dataRef = useRef(data)
dataRef.current = data

useEffect(() => {
  const silentRefresh = dataRef.current !== null
  // ...
}, [chartDays])
```

This matches how [`Dashboard.new.jsx`](../frontend/src/pages/Dashboard.new.jsx) avoids a refetch loop while staying correct for silent range changes.

## Code splitting

Route-level lazy loading lives in [`frontend/src/App.jsx`](../frontend/src/App.jsx): `React.lazy`, one `Suspense` boundary, heavy pages load on demand.

## Backend: tenant cache

[`backend/services/tenantCacheService.js`](../backend/services/tenantCacheService.js) caches hot **GET** responses per company (dashboard, inventory overview, clients, jobs, locations). Writes call `bustCompanyCache(companyId)` so data stays fresh within one request after a save.

| Env | Purpose |
|-----|---------|
| `TENANT_CACHE_TTL_MS` | List/overview TTL (default 30s). `0` disables those caches. |
| `DASHBOARD_CACHE_TTL_MS` | Dashboard TTL (default 20s). `0` disables dashboard cache only. |
| `INVENTORY_OVERVIEW_CACHE_TTL_MS` | Optional override for `/supplies/overview`. |
| `REDIS_URL` | Optional — shared cache when running multiple API replicas. |

| Scenario | Suggestion |
|----------|------------|
| Local dev, single API process | Defaults are fine. |
| Multiple replicas | Set `REDIS_URL` (e.g. Upstash). |
| Debugging stale reads | Lower TTLs or set `TENANT_CACHE_TTL_MS=0`. |

`GET /health` includes a `cache` field (`memory` or `redis`).

## Auth tokens (current stack)

The SPA stores the JWT in **localStorage** and sends it with axios. That is common for SPAs but is vulnerable to XSS; mitigations include strict CSP, dependency hygiene, and (longer term) **httpOnly** session cookies with CSRF protection. Documenting the choice here avoids surprise in security reviews.

## Where to look next

- Backend env template: [`backend/.env.sample`](../backend/.env.sample)
- Supabase / Postgres: [`SUPABASE.md`](../SUPABASE.md)

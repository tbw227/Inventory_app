# Marketing site (separate repo)

The public customer-facing website lives **outside** this repository:

**Path:** `../platform-marketing` (sibling folder on disk)

It is its own Vite project and should have its **own git repository** for independent deploys and scaling.

## Connection to this app

| Concern | Where |
|---------|--------|
| Signup / login API | `backend` — `POST /api/v1/auth/register`, `/login` |
| Database | Same PostgreSQL as this app (new `companies` + `users` rows per signup) |
| After auth | Redirect to `frontend` `/auth/handoff#token=...` |
| CORS | `MARKETING_URL` in `backend/.env` |

## Branding

- **Marketing site** — SaaS product name via `VITE_PRODUCT_NAME` in `platform-marketing/.env`
- **This app** — same via `VITE_PRODUCT_NAME` in `frontend/.env` (no client-specific branding like "Code 3" in the shell UI)

Client business names are **tenant** `companies.name` values, not the platform brand.

See `platform-marketing/README.md` for setup.

# Supabase setup guide

This app uses **PostgreSQL** with **Prisma** and **Express**. Supabase is a good place to host that database. Auth and business logic stay in the **API** unless you deliberately adopt Supabase Auth or PostgREST later.

---

## What you get

| Piece | Role |
|--------|------|
| **Supabase Postgres** | Production/staging `DATABASE_URL` for Prisma |
| **`supabase/` CLI** | Local Postgres + Studio (`npm run supabase:start`) |
| **`@supabase/supabase-js` (frontend)** | Optional: Auth, Storage, Realtime (`src/lib/supabaseClient.js`) |
| **`supabase/migrations/*.sql`** | SQL mirror of the schema; **not** the primary migration pipeline (see below) |

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a region close to your users and API.
3. Save the **database password** you set (you need it for connection strings).

---

## 2. Backend: `DATABASE_URL` + `DIRECT_URL` (Prisma)

Prisma is configured with **`directUrl`** so it can use a **pooler** for the running app and a **direct** host for migrations (see `backend/prisma/schema.prisma`).

### IPv4 networks (Session pooler)

If Supabase shows **“Not IPv4 compatible”** for the direct host, use the dashboard’s **Session pooler** (Shared pooler) for the app:

1. **Project Settings → Database** → connection method **Session pooler** → **URI**.
2. The username looks like `postgres.[project-ref]` (not plain `postgres`).
3. Set in `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1&pool_timeout=60"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

- **`DATABASE_URL`**: Session pooler (IPv4-friendly) for Express/Prisma at runtime.  
- **`DIRECT_URL`**: Direct host for `prisma migrate`. If **migrate fails** from your PC (IPv4-only), use Supabase **IPv4 add-on**, run migrations from CI/GitHub Actions (often has IPv6), or apply SQL from `backend/prisma/migrations` in the SQL editor.

### IPv6 / simple setup

If direct access works from your machine, you can set **both** variables to the same **direct** URI (optional `?pgbouncer=true` only when using a pooler).

### Rest of `.env`

Copy `backend/.env.sample` → `backend/.env` and set at least:

- `DATABASE_URL` and `DIRECT_URL` (both required)
- `JWT_SECRET`, `FRONTEND_URL`, and other vars from the sample as needed

Then from the repo:

```bash
cd backend
npx prisma migrate deploy
```

For local development against a fresh DB you can use `npx prisma migrate dev` instead.

Optional seed data:

   ```bash
   npm run seed
   ```

---

## 3. Frontend: optional Supabase client

Only needed if you use **Supabase Auth**, **Storage**, **Realtime**, or the **Data API** from the browser.

1. **Project Settings → API**
2. Copy **Project URL** and the **anon public** key.
3. Copy `frontend/.env.sample` → `frontend/.env` and set:

   ```env
   VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=[anon key]
   ```

4. In code:

   ```js
   import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
   ```

If those env vars are missing, `supabase` is `null` and the rest of the app can keep using the Express API and JWT as today.

**Never** put the **service role** key in the frontend or in any client bundle.

---

## 4. Photo storage (recommended for production)

Job photos and profile avatars upload through the **Express API** into a private Supabase Storage bucket when these server env vars are set:

```env
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role secret from Settings → API]
SUPABASE_STORAGE_BUCKET=photos
```

- Objects are stored at `{company_id}/{filename}.webp` — same tenant isolation as the database.
- The browser still loads images via **`GET /api/v1/uploads/photos/...`** with JWT (no direct Storage URLs in the SPA).
- On API startup, the server creates the `photos` bucket if missing (or run `supabase/migrations/20260608250000_storage_photos_bucket.sql` in the SQL editor).
- Without these vars, uploads fall back to local disk under `backend/uploads/photos/` (fine for dev/tests; ephemeral on Railway).

**Never** put the **service role** key in the frontend or in git.

---

## 5. Optional backend env (other SDK use)

For Edge Functions or other server-only Supabase SDK calls, the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` apply (see `backend/.env.sample`).

Keep service role credentials only on the server and out of git.

---

## 6. Supabase CLI (local stack)

Install the CLI: [Supabase CLI docs](https://supabase.com/docs/guides/cli/getting-started).

From the **repository root**:

| Command | Purpose |
|---------|--------|
| `npm run supabase:start` | Local Postgres, API, Studio, etc. |
| `npm run supabase:stop` | Stop local services |
| `npm run supabase:status` | URLs and ports |

**Link this repo to a hosted project** (for `db push`, branches, etc.):

```bash
npx supabase login
npx supabase link --project-ref [YOUR_PROJECT_REF]
```

`project_ref` is the short id in your project URL (`https://supabase.com/dashboard/project/[ref]`).

---

## 7. Migrations: one source of truth

**Use Prisma as the authority** for schema changes in this codebase:

- Apply with `npx prisma migrate deploy` (or `migrate dev` locally).
- The files under `supabase/migrations/` are kept as a **SQL mirror** for Supabase SQL editor or CLI workflows. They should stay aligned with Prisma when you change the schema.

Avoid applying **both** `supabase db push` and Prisma migrations to the **same** production database without a documented, repeatable process. That pattern is easy to get out of sync.

---

## 8. Row Level Security (RLS)

This app’s primary security model is **Express + JWT + Prisma**, not browser queries with RLS.

Migration **`20260608240000_enable_rls_data_api_lockdown`** enables RLS on all app tables **with no policies for `anon` / `authenticated`**. That blocks direct Supabase Data API access when the public anon key is in the frontend. Prisma (postgres role) bypasses RLS — the Express API is unchanged.

When you add a new table via Prisma, add `ENABLE ROW LEVEL SECURITY` in the same migration (or a follow-up) so PostgREST stays locked down.

If you later adopt **Supabase Auth + browser Data API**, add explicit `CREATE POLICY` rules per table scoped by `company_id` — do not remove RLS.

---

## 9. Troubleshooting

| Issue | What to check |
|--------|----------------|
| `EMAXCONNSESSION` / max clients (session pooler) | Add `connection_limit=1&pool_timeout=60` to **pooled** `DATABASE_URL` so Prisma does not open many sessions; restart the API |
| Prisma cannot connect | `sslmode=require`, correct password, project not paused |
| Migrate errors | Prefer direct `5432` URL; pooler needs [Prisma + PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer) settings |
| IPv6 / network errors | Supabase docs on IPv4 add-on or different network |
| Frontend `supabase` is `null` | `VITE_*` vars must be set in `frontend/.env` and dev server restarted |
| Photos disappear after redeploy | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on the API host |
| Confirm RLS on all tables | `cd backend && node scripts/check-rls.js` |

---

## Quick checklist

- [ ] Supabase project created  
- [ ] `backend/.env` has `DATABASE_URL`  
- [ ] `npx prisma migrate deploy` succeeded  
- [ ] API starts and can reach the DB  
- [ ] (Production) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=photos` on API  
- [ ] (Optional) `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  
- [ ] (Optional) `npx supabase link` if you use hosted CLI features  

For day-to-day app commands (dev servers, tests), see the root **README** and **QUICKREF**.

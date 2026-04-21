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

## 4. Optional backend env (service role)

For server-only SDK usage (e.g. Storage admin, Edge Functions calling back with service role), you can add to `backend/.env` (see comments in `backend/.env.sample`):

```env
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role secret]
```

Keep this only on the server and out of git.

---

## 5. Supabase CLI (local stack)

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

## 6. Migrations: one source of truth

**Use Prisma as the authority** for schema changes in this codebase:

- Apply with `npx prisma migrate deploy` (or `migrate dev` locally).
- The files under `supabase/migrations/` are kept as a **SQL mirror** for Supabase SQL editor or CLI workflows. They should stay aligned with Prisma when you change the schema.

Avoid applying **both** `supabase db push` and Prisma migrations to the **same** production database without a documented, repeatable process. That pattern is easy to get out of sync.

---

## 7. Row Level Security (RLS)

This app’s primary security model is **Express + JWT + Prisma**, not browser queries with RLS.

You do **not** need Supabase’s “automatically enable RLS on every new table” helper for this architecture. Turning RLS on without policies breaks PostgREST access for those tables; it is most useful when you intentionally build around **Supabase Auth + RLS policies** for each table.

---

## 8. Troubleshooting

| Issue | What to check |
|--------|----------------|
| `EMAXCONNSESSION` / max clients (session pooler) | Add `connection_limit=1&pool_timeout=60` to **pooled** `DATABASE_URL` so Prisma does not open many sessions; restart the API |
| Prisma cannot connect | `sslmode=require`, correct password, project not paused |
| Migrate errors | Prefer direct `5432` URL; pooler needs [Prisma + PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer) settings |
| IPv6 / network errors | Supabase docs on IPv4 add-on or different network |
| Frontend `supabase` is `null` | `VITE_*` vars must be set in `frontend/.env` and dev server restarted |

---

## Quick checklist

- [ ] Supabase project created  
- [ ] `backend/.env` has `DATABASE_URL`  
- [ ] `npx prisma migrate deploy` succeeded  
- [ ] API starts and can reach the DB  
- [ ] (Optional) `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  
- [ ] (Optional) `npx supabase link` if you use hosted CLI features  

For day-to-day app commands (dev servers, tests), see the root **README** and **QUICKREF**.

# Supabase audit checklist

Work top to bottom. Mark status: ⬜ todo · 🔄 in progress · ✅ verified · ⚠️ needs your action (dashboard/env).

**Authority:** Prisma migrations win over `supabase/migrations/` SQL mirror.

| # | Area | Item | Status |
|---|------|------|--------|
| 1 | **Postgres** | Hosted project + `DATABASE_URL` (pooler) + `DIRECT_URL` (direct) | ✅ |
| 2 | **Postgres** | Prisma `schema.prisma` — `url` + `directUrl` | ✅ |
| 3 | **Postgres** | `backend/config/db.js` — connect + validate env | ✅ |
| 4 | **Postgres** | `backend/.env.sample` — Supabase URL comments | ✅ |
| 5 | **Migrations** | All Prisma migrations applied on hosted DB | ✅ |
| 6 | **Migrations** | `supabase/migrations/` mirror synced with Prisma | ✅ |
| 7 | **Security** | RLS enabled on all app tables (Data API lockdown) | ✅ |
| 8 | **Storage** | API env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | ⬜ |
| 9 | **Storage** | `photos` bucket exists (migration or startup `ensurePhotosBucket`) | ⬜ |
| 10 | **Storage** | `photoStorageService` + upload/download routes | ⬜ |
| 11 | **Storage** | Frontend loads photos via JWT `/api/v1/uploads/…` (not public Storage URLs) | ⬜ |
| 12 | **Frontend SDK** | `frontend/src/lib/supabaseClient.js` + `VITE_*` env (optional) | ⬜ |
| 13 | **Backend SDK** | `backend/lib/supabaseAdmin.js` + `@supabase/supabase-js` | ⬜ |
| 14 | **Security** | Service role never in frontend/git; anon key public-only | ⬜ |
| 15 | **CLI** | `supabase/config.toml` + root `npm run supabase:*` scripts | ⬜ |
| 16 | **CLI** | `npx supabase link` to hosted project (optional) | ⬜ |
| 17 | **Docs** | `SUPABASE.md` accurate | ⬜ |
| 18 | **Docs** | `docs/adr/0003-supabase.md` + cross-links (README, GO_LIVE, RAILWAY) | ⬜ |
| 19 | **Prod** | Railway env vars set; `prisma migrate deploy` on start succeeds | ⚠️ |
| 20 | **Agent** | Supabase skills installed (`.agents/skills/supabase*`) | ✅ |

---

## Item notes (filled as we go)

### 1 — Postgres connection strings

- **Pooler (`DATABASE_URL`):** session pooler, `pgbouncer=true`, `connection_limit=1`, `pool_timeout=60`, `sslmode=require`
- **Direct (`DIRECT_URL`):** `db.[ref].supabase.co:5432`, `sslmode=require` — used by `prisma migrate deploy`
- **Local/CI:** both can point at same Postgres (Docker or CI service)
- **Verify:** `cd backend && npx prisma migrate deploy` then API `/health` → `"database": "connected"`

### 6 — Known mirror gaps (fix when we reach #6)

~~Resolved — four missing mirrors added; Prisma remains authority.~~

**Supabase-only** (Storage DDL, not in Prisma):

- `20260608250000_storage_photos_bucket.sql`

**Timestamp note:** initial schema is `20260407140100` (Prisma) vs `20260407140000` (supabase mirror) — same content, different id.

### 7 — RLS verification

Re-run anytime:

```bash
cd backend && node scripts/check-rls.js
```

Expect `missing: []` and `disabled: []` for all 14 app tables.

---

Update status column as each item is verified.

# ADR 0003 — Supabase alongside self-hosted Postgres

**Status:** Accepted.
**Date:** 2026-04

---

## Context

We need PostgreSQL for the Prisma-backed API (ADR 0001). Hosting options considered:

- A self-managed Postgres (AWS RDS / DigitalOcean / bare VM + pgBouncer).
- Supabase (managed Postgres + auth + storage + client SDK).
- Neon / Crunchy / Render managed Postgres (Postgres only, no extras).

The team is small; operational overhead is a primary cost.

## Decision

Use **Supabase** as the **primary hosted Postgres** for staging and production. Keep **local Postgres via Docker Compose** for development and CI.

Use Supabase as a **database provider only**. The application's authentication, sessions, and authorisation live in the API (see ADR 0002). The Supabase anon client in the frontend (`frontend/src/lib/supabaseClient.js`) is reserved for narrow, RLS-protected features and is not used for user login.

## Rationale

- **Managed Postgres without lock-in** — Supabase is Postgres. If we leave, we pg_dump and restore anywhere.
- **Connection pooling included** — the pooler URL (`DATABASE_URL`) and direct URL (`DIRECT_URL`) are both exposed, matching Prisma's expectation of a pooled runtime connection and a direct migration connection.
- **One-click SQL migrations** — the `supabase/migrations/` mirror lets us run the same migrations against a Supabase project from the Supabase CLI if needed.
- **Free tier for staging** — keeps the cost of a separate staging environment near zero.
- **Storage and edge functions available** — not used today, but an option if product needs evolve.

## Decision boundaries

- **Prisma is the authority** for schema. `backend/prisma/schema.prisma` is the source; `backend/prisma/migrations/` and `supabase/migrations/` stay in sync. If they diverge, `prisma migrate deploy` wins.
- **The Supabase anon key in the frontend is public by design.** It is a narrow JWT scoped by Row Level Security. Any RLS policy we rely on must be tested; if we ever disable RLS on a table, the anon key must not see that table.
- **User auth never goes through Supabase Auth.** Users live in our `User` table; passwords are bcrypt-hashed in `backend/utils/auth.js`; tokens are our JWTs (ADR 0002).

## Consequences

### Positive
- Zero Postgres ops in production — backups, point-in-time recovery, and minor-version upgrades are managed.
- Both developers and CI hit the same shape of database (Postgres 16).
- Switching hosts later is a dump + restore; there is no Supabase-specific SQL.

### Negative
- Two URLs to manage (`DATABASE_URL` pooled, `DIRECT_URL` direct). Prisma needs both; the `.env.sample` documents this clearly.
- The free tier pauses projects after a week of inactivity; not a concern for production, occasionally a gotcha for staging.
- Supabase outages affect us directly. Mitigation: regular pg_dump (see `SUPABASE.md`).

## Alternatives considered

- **AWS RDS** — more ops overhead for the same core benefit. Reconsider when we need VPC-only networking or specific compliance features.
- **Neon** — serverless Postgres is attractive, but per-query branching semantics complicate Prisma connection handling; revisit if Supabase becomes a bottleneck.
- **Run Postgres on the same VM as the API** — rejected; loses backups, PITR, and the ability to scale the API tier independently.

## Revisit triggers

- Supabase pricing or feature changes that remove a capability we rely on.
- A compliance requirement that requires VPC-only or region-locked hosting not offered by Supabase.
- A performance regression tied to the pooler that cannot be resolved via `DIRECT_URL` usage or query tuning.

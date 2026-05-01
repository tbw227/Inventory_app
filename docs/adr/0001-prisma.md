# ADR 0001 — Prisma over Mongoose / TypeORM / raw SQL

**Status:** Accepted — implemented in the April 2026 backend rewrite.
**Date:** 2026-04

---

## Context

The original MVP (documented in historical docs like the pre-update `QUICKREF.md` and `SECURITY.md`) used MongoDB with Mongoose. As the product moved toward multi-tenant billing, foreign-key relationships (`Company → User → Job → Supply → Payment`), and reporting queries, the document-oriented model started hurting:

- Joins via manual `populate()` with no query planner.
- No transactional guarantees across multiple collections (critical for "complete job → decrement stock → create payment").
- No ergonomic schema migration story; migrations were scripts plus discipline.
- Reporting required either heavy aggregation pipelines or a parallel SQL read store.

We reviewed three alternatives: **TypeORM**, **Drizzle**, and **Prisma**, all on PostgreSQL.

## Decision

Adopt **Prisma** with **PostgreSQL** as the single source of truth for application data. Keep Supabase as a compatible hosting option (see ADR 0003).

## Rationale

- **Schema-first with migrations** — `prisma/schema.prisma` is the one place the shape is declared; `prisma migrate dev` and `prisma migrate deploy` give us a real migration history checked into git (`backend/prisma/migrations/`).
- **Type-safe queries** — even in JavaScript, the generated client gives autocomplete that matches the schema. Prevents entire classes of typos.
- **Transactions** — `prisma.$transaction` is first-class and used in `jobService`, `paymentService`, `supplyImportService`.
- **Raw escape hatch** — tagged-template `$queryRaw` covers the handful of reporting queries that ORM-generated SQL cannot express efficiently.
- **Ecosystem maturity** — Prisma has the largest adoption of the three alternatives, best docs, and a stable 5.x line during the migration window.

## Consequences

### Positive
- Referential integrity is enforced at the DB, not at the app layer.
- Migrations are reviewable diffs in PRs.
- Reporting queries run natively in SQL rather than via Mongo aggregation DSL.

### Negative
- PostgreSQL needs to be available at all times (MongoDB Atlas free tier had been fine for dev); mitigated by Supabase + local Docker.
- Prisma generates a client at `postinstall` — the backend Dockerfile accounts for this.
- Migrations must be applied before the app starts; this ordering is baked into both CI and the production Dockerfile.
- Existing historical docs (`SUMMARY.md`, legacy `AUTHENTICATION.md`) still reference Mongo; the README and `QUICKREF.md` mark these as historical. `AUDIT.md §8` tracks cleanup.

## Alternatives considered

- **TypeORM** — active but more opaque; decorators made the schema harder to review and migrations felt more brittle during our evaluation.
- **Drizzle** — appealing for its SQL-first ergonomics, but the ecosystem and migration tooling were less mature at decision time. Reconsider for a future subsystem if Prisma becomes a bottleneck.
- **Raw SQL + small query helpers** — rejected because the schema changes frequently enough that the manual overhead of keeping DDL, types, and queries in sync outweighed the runtime benefit.

## Revisit triggers

- A single query repeatedly exceeds 500 ms in production and cannot be expressed well in Prisma.
- Prisma's migration engine blocks a deployment we cannot work around.
- We outgrow a single PostgreSQL instance (sharding / per-tenant DBs).

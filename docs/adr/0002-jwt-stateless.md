# ADR 0002 — Stateless JWT bearer auth (for now)

**Status:** Accepted with known gaps — planned iteration is tracked in `AUDIT.md §2.2` and §2.5.
**Date:** 2026-04

---

## Context

The SPA needs an auth model that:
- Works across the API (`backend/`) and the SPA (`frontend/`) with no shared session store.
- Carries company and role so every request can be authorised without a DB roundtrip for claims.
- Can scale horizontally without sticky sessions.
- Fits a single-developer team's maintenance budget.

## Decision

Use **stateless JWTs** signed with HS256 and a server-side `JWT_SECRET`. Tokens are returned by `/api/v1/auth/login`, stored by the SPA in `localStorage`, and sent as `Authorization: Bearer <token>` on every API call. Lifetime is 8 hours.

Implementation: `backend/utils/auth.js` (sign/verify), `backend/middleware/auth.js` (extract, verify, load user, enforce roles + subscription).

## Rationale

- **No session store** — removes the need for Redis just to hold sessions; fits a small ops surface.
- **Horizontal scale** — any backend replica can validate a token without coordination.
- **Readable payload** — `{ id, email, role, companyId }` means middleware can authorise without hitting the DB every request (though we do still load the user for freshness).
- **Known pattern** — the operations runbook is the well-documented JWT lifecycle; no custom session protocol to explain to new contributors.

## Known gaps (intentional — see revisit triggers)

- **No `jti`, no revocation.** A stolen token is valid for up to 8 hours. `AUDIT.md §2.2`.
- **`localStorage` storage.** Any XSS on the origin can exfiltrate the token. `AUDIT.md §2.5`.
- **No refresh token.** Users must re-login after the 8 h window.

These are accepted today because the user base is small, the network is internal, and the cost of implementing refresh tokens + a denylist correctly is higher than the current threat level. Each is tracked with a specific fix.

## Consequences

### Positive
- Login → dashboard flow takes one round trip per request; no session lookups.
- Works identically in dev, Docker Compose, and production.
- No infra dependency for auth beyond the app itself.

### Negative
- Revoking a user before their token expires requires either changing `JWT_SECRET` (nuclear — logs everyone out) or flipping their `User.active = false` (we already load the user, so this works if applied in the middleware; verify on changes).
- Token theft has a wide blast radius until the refresh-token work lands.

## Planned evolution

1. **Add `jti`** to every issued token.
2. **Shorten access token to 15 min** and add a refresh token stored in an `httpOnly` + `Secure` + `SameSite=Lax` cookie with a server-side denylist.
3. **Move the access token to memory-only state** in the SPA; remove `localStorage` writes.
4. **Add `/auth/logout`** that adds the `jti` to the denylist.

At the end of step 3, update this ADR's status to "Superseded" with a link to ADR 0004.

## Revisit triggers

- Any verified token-theft incident.
- Compliance requirement (SOC 2, HIPAA) that forces a session-revocation SLA.
- The user base grows past ~5,000 MAU or introduces admin roles with broad access.

## Alternatives considered

- **Server-side sessions** (`express-session` + Redis) — rejected for the infra dependency; retained as a fallback if stateless + refresh proves insufficient.
- **Supabase Auth** — rejected because we already run our own user table, multi-tenant `companyId`, and subscription state; dual source of truth is worse than either alone.
- **OAuth / social login** — not a product requirement today.

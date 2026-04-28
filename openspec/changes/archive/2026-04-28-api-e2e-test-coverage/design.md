## Context

`apps/api` uses NestJS + Drizzle ORM + PostgreSQL. E2E tests run against a real test DB with deterministic seed data. Current e2e suite has 6 files covering auth, users, and a single admin-only workspace workflow. A code review identified that `WorkspaceAdminGuard` (protecting 9 routes) is never exercised with a non-admin token, invite negative paths are untested, workspace settings routes have zero coverage, and the refresh-token unit test skips claim assertions.

Existing test infrastructure:
- `vitest` test runner, full `AppModule` bootstrap via `Test.createTestingModule`
- `test/helpers/auth.ts` — `login(app, firebaseToken)` returns `{ accessToken, refreshToken, accessTokenExpiresIn }`, `bearer(token)` for header
- Fake Firebase auth: token format `test:<uid>:<email>[:<name>]`
- Direct DB access: `app.get<DrizzleDB>(DRIZZLE)` for setup/verification
- Seed data includes 4 users (admin, pm, 2x member), 1 workspace, settings (USD/100), 1 pending invite

## Goals / Non-Goals

**Goals:**
- Guarantee that removing `WorkspaceAdminGuard` from any admin route causes e2e test failure (403 assertions for member token, 401 for no token)
- Cover all invite failure paths with DB-backed verification that no membership is created on failure
- Cover workspace settings and workspace update CRUD happy paths and validation errors
- Verify refreshed access token JWT claims match current membership state

**Non-Goals:**
- No production code changes
- No changes to existing test helpers (they suffice as-is)
- No performance/load testing
- No unit test coverage for repositories (Drizzle mock drift is a known trade-off covered by e2e)
- No new test infrastructure or utilities

## Decisions

### D1: Single RBAC test file vs per-route files

**Decision:** All 401/403 authorization tests go in `test/workspace-rbac.e2e-spec.ts`.

**Rationale:** 9 admin routes with identical 403/401 pattern — splitting into per-route files would create boilerplate duplication. One file with one `beforeAll` (login admin + member) serves all assertions. Other test files (workspace-settings, invite-negative-paths) focus on their domain without RBAC duplication.

**Alternative:** Per-route files — rejected due to setup duplication.

### D2: Seed user for member token

**Decision:** Use seed user `seed-user-2` (bob@gitiempo.dev, role: member) for member-token tests. Login via `login(app, 'test:seed-user-2:bob@gitiempo.dev:Bob')`.

**Rationale:** Seed data guarantees this user exists with membership. No need to create a user + membership per test file.

### D3: Fresh invite creation per test case

**Decision:** Each negative-path test creates its own invite via `POST /invites` or direct DB insert, then mutates state as needed (expire, accept, etc.).

**Rationale:** Avoids cross-test dependencies. The seed invite (`dev-invite-token`) is left untouched so other test files can use it.

**Alternative:** Reuse seed invite — rejected because tests would become order-dependent and fragile.

### D4: DB-backed membership count verification

**Decision:** After each invite failure test, assert `SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $ws` has not increased.

**Rationale:** Prevents subtle bugs where invite acceptance partially creates a membership before throwing. Simple count check is sufficient since no other test runs concurrently against this DB.

### D5: Refresh claims tested at unit level only

**Decision:** Extend `auth.service.spec.ts` only. No e2e refresh-claims test.

**Rationale:** The unit test already has mock infrastructure for `MembersService` and JWT verification. Adding claim assertions there is straightforward and isolated. E2e refresh tests in `auth.e2e-spec.ts` cover rotation/reuse mechanics — claim shape is a unit concern.

### D6: File grouping

| File | Domain | What it covers |
|------|--------|---------------|
| `test/workspace-rbac.e2e-spec.ts` | Authorization | 403/401 for all 9 admin-only routes |
| `test/workspace-settings.e2e-spec.ts` | Workspace CRUD | GET/PATCH settings, PATCH workspace, validation 400s |
| `test/invite-negative-paths.e2e-spec.ts` | Invite failures | 409/410/404/403 for invites, DB membership count checks |
| `src/auth/services/auth.service.spec.ts` | Auth unit | Refresh claim assertions (edit existing) |

## Risks / Trade-offs

- **[Flaky DB state between tests]** → Each test file uses isolated `beforeAll`/`afterAll`. No shared mutable state between files. Within a file, test ordering is sequential and state accumulates intentionally (e.g., create invite → duplicate it).
- **[Seed data coupling]** → Tests depend on seed users (admin, bob). If seed schema changes, tests break. Mitigated by seed being version-controlled and deterministic.
- **[CI time increase]** → ~10-15s additional runtime. Acceptable for the coverage gained.
- **[No cancelled invite status in DB]** → DB schema only has `pending | accepted | expired`. "Cancelled" is tested by attempting to delete a non-pending invite (accepted/expired status) → 404. This matches the service behavior (`NotFoundException('Pending invite not found')`).

## Why

Code review revealed critical test coverage gaps in `apps/api`: `WorkspaceAdminGuard` is never exercised with a non-admin token (if removed, zero tests fail), invite negative paths (409, 410, expired, cancelled, reuse, already-member) are completely untested, workspace settings and PATCH /workspace routes have zero e2e coverage, and the refresh-token unit test skips JWT claim assertions. These gaps leave authorization boundaries and membership gate logic unprotected by automated tests.

## What Changes

- Add e2e test file `test/workspace-rbac.e2e-spec.ts` — member-token 403 and no-token 401 assertions for all 9 admin-only routes (PATCH /workspace, GET/PATCH /workspace/settings, GET /members, PATCH /members/:id/role, DELETE /members/:id, GET /invites, POST /invites, DELETE /invites/:id)
- Add e2e test file `test/invite-negative-paths.e2e-spec.ts` — duplicate invite 409, cancel not-found 404, cancel non-pending 404, accept bad-token 404, accept expired 410, accept already-accepted 409, accept email-mismatch 403, accept already-member 409, DB-backed membership count verification after each failure
- Add e2e test file `test/workspace-settings.e2e-spec.ts` — happy-path CRUD for GET /workspace/settings, PATCH /workspace/settings, PATCH /workspace, plus validation 400 cases (empty body, invalid currency, name too long)
- Extend `src/auth/services/auth.service.spec.ts` — decode and assert JWT claims (sub, firebaseUid, workspaceId, role) in the existing refresh-token rotation test; add a test verifying refreshed claims reflect a role change

## Capabilities

### New Capabilities

- `api-e2e-rbac-tests`: e2e tests asserting member tokens receive 403 and unauthenticated requests receive 401 on all WorkspaceAdminGuard-protected routes
- `api-invite-negative-tests`: e2e tests for invite failure paths — duplicate, expired, cancelled, reuse, email mismatch, already-member — with DB membership count verification
- `api-workspace-settings-tests`: e2e tests for workspace settings and workspace update CRUD happy paths and validation error cases
- `api-refresh-claims-unit-test`: unit test extension verifying refreshed access token carries correct JWT claims including after role changes

### Modified Capabilities

_(none — no spec-level behavior changes, only test additions)_

## Impact

- Test files only: 3 new e2e test files in `apps/api/test/`, 1 modified unit test in `apps/api/src/auth/services/`
- No production code changes
- No API contract changes
- No dependency changes
- CI time increase: ~10-15s additional e2e runtime (DB-backed tests against test PostgreSQL)

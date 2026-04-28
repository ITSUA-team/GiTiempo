## 1. Workspace RBAC E2E Tests

- [x] 1.1 Create `apps/api/test/workspace-rbac.e2e-spec.ts` with AppModule bootstrap, admin login, member login (seed-user-2 / bob@gitiempo.dev)
- [x] 1.2 Add 403 test cases for member token on all 9 admin-only routes: PATCH /workspace, GET /workspace/settings, PATCH /workspace/settings, GET /members, PATCH /members/:id/role, DELETE /members/:id, GET /invites, POST /invites, DELETE /invites/:id
- [x] 1.3 Add 401 test cases for no-token on all 9 admin-only routes
- [x] 1.4 Run `pnpm test:e2e -- workspace-rbac` and verify all 18 cases pass

## 2. Workspace Settings E2E Tests

- [x] 2.1 Create `apps/api/test/workspace-settings.e2e-spec.ts` with AppModule bootstrap and admin login
- [x] 2.2 Add GET /workspace/settings happy-path test — verify 200 with correct shape and seed defaults (USD, 100)
- [x] 2.3 Add PATCH /workspace/settings tests — update currency, update defaultHourlyRate, set rate to null, verify via subsequent GET
- [x] 2.4 Add PATCH /workspace tests — update name, verify via subsequent GET /workspace
- [x] 2.5 Add GET /workspace test — verify 200 with correct shape
- [x] 2.6 Add validation 400 tests — empty body on PATCH /workspace/settings, invalid currency (lowercase), empty body on PATCH /workspace, name > 255 chars
- [x] 2.7 Run `pnpm test:e2e -- workspace-settings` and verify all cases pass

## 3. Invite Negative Paths E2E Tests

- [x] 3.1 Create `apps/api/test/invite-negative-paths.e2e-spec.ts` with AppModule bootstrap, admin login, DB access
- [x] 3.2 Add POST /invites duplicate test — create invite for email X (201), create again for same email (409)
- [x] 3.3 Add POST /invites validation tests — invalid email (400), invalid role (400), extra fields (400)
- [x] 3.4 Add DELETE /invites/:id tests — non-existent UUID (404), non-pending invite (404)
- [x] 3.5 Add POST /invites/accept bad token test (404)
- [x] 3.6 Add POST /invites/accept expired invite test — DB insert with expiresAt in past, accept (410), verify no membership created
- [x] 3.7 Add POST /invites/accept already-accepted test — accept once (204), accept again (409), verify no duplicate membership
- [x] 3.8 Add POST /invites/accept email mismatch test — invite for email A, Firebase identity for email B (403), verify no membership created
- [x] 3.9 Add POST /invites/accept already-member test — invite for bob@gitiempo.dev (existing member), accept (409), verify no duplicate membership
- [x] 3.10 Run `pnpm test:e2e -- invite-negative-paths` and verify all cases pass

## 4. Refresh Claims Unit Test

- [x] 4.1 In `apps/api/src/auth/services/auth.service.spec.ts`, extend the "rotates the refresh token" test to decode the refreshed access token and assert sub, firebaseUid, workspaceId, role claims
- [x] 4.2 Add new test "reflects current role after role change" — mock members to return role "pm", refresh, decode, assert role === "pm"
- [x] 4.3 Run `pnpm --filter @gitiempo/api test -- auth.service.spec` and verify all tests pass

## 5. Full Suite Verification

- [x] 5.1 Run `pnpm test` and `pnpm test:e2e` from repo root — verify zero failures
- [x] 5.2 Run `pnpm typecheck` — verify no type errors

# Tasks

## 1. API — Remove dead entry points and consolidate token issuance

- [x] 1.1 Delete `AuthService.createSessionForMember` and the private `createRegisteredSession` wrapper; verify `pnpm --filter @gitiempo/api typecheck` reports no production caller and grep finds no remaining references outside tests
- [x] 1.2 Extract a single transaction-aware `issueSession(tx, claims, membershipId, familyId)` helper wrapping `issueTokenPair` + the `refreshTokens` insert; verify `provisionSocialSession`, `createRegisteredSessionInTransaction`, and `issueRegisteredSessionForExistingUser` all route through it
- [x] 1.3 Update `auth.service.spec.ts` `createSessionForMember` describe block to assert the consolidated `issueSession`/`issueTokenPair` path instead of the removed method; verify the updated spec passes
- [x] 1.4 Replace `createSessionForMember` positional mocks in `auth-github.service.spec.ts` with assertions on reservation commits, lock acquisition, and atomic session outcome; verify `auth-github.service.spec.ts` passes
- [x] 1.5 Run `pnpm --filter @gitiempo/api lint && typecheck && test` and confirm no new failures vs. baseline

## 2. API — Normalize profile aliases at the social-provisioning boundary

- [x] 2.1 Normalize `name`→`displayName` and `picture`→`avatarUrl` once at the top of `provisionSocialSession`, producing a canonical input shape before identity resolution; verify `resolveSocialUserInTransaction` reads only `displayName`/`avatarUrl`
- [x] 2.2 Add/extend unit tests covering GitHub-OAuth `name`/`picture` input, Google `displayName`/`avatarUrl` input, and missing-picture behavior; verify the avatar ownership rules (provider-owned refresh, user-owned preservation) still pass
- [x] 2.3 Run `pnpm --filter @gitiempo/api test` and confirm the social-provisioning and avatar specs pass

## 3. API — Extract identity/reservation coordination (behavior-preserving)

- [x] 3.1 Move reservation lifecycle helpers (`reserve*`, `findReservation*`, `confirm*`, `reject*`, `bindSocialIdentityReservation`, `lockIdentityReservationKeys`, `deleteUnboundRegistrationReservation`, `compensateKnownRegistrationFailure`) into a focused internal collaborator/module; verify lock key ordering (`email:` before `uid:`) and `tx` ownership are unchanged
- [x] 3.2 Add a regression test asserting identity lock key order and transaction ownership remain identical for `register`, `recoverPendingRegistration`, and `provisionSocialSession`; verify the test passes
- [x] 3.3 Run `pnpm --filter @gitiempo/api lint && typecheck && test` and confirm auth, invite, cross-provider race, rollback, and exact-UID recovery suites pass

## 4. API — Aged unbound reservation observability

- [x] 4.1 Add a validated config/env key for the aged-reservation age threshold (e.g. `AUTH_AGED_RESERVATION_THRESHOLD`); wire it through `src/config/env.validation.ts` and document it in `apps/api/.env.example`; verify validation accepts the new key
- [x] 4.2 Implement a reusable `findAgedUnboundRegistrationReservations(threshold)` query over `firebase_identity_reservations` (`purpose='registration' AND state='reserved' AND createdAt < now() - threshold`); verify a unit test seeded with aged/bound/recent rows returns only the aged unbound one
- [x] 4.3 Emit a structured, redacted `logger.warn` event per aged reservation (normalized email + reserved UID + age, no password/credentials); verify a unit test asserts the redacted payload and that no reservation state is mutated
- [x] 4.4 Expose the aged-reservation query through the platform-operator **assess** endpoint (see group 7); verify the endpoint returns only aged unbound rows, redacted, and creates no local user/workspace/membership/session

## 5. API — Schema migration for operator recovery

- [x] 5.1 Add a Drizzle migration creating the `identity_recovery_audit` table (reservation id, normalized email, reserved UID, purpose, non-secret registration foundation snapshot, operator decision, provider-absence evidence summary, created_at/updated_at); verify `pnpm --filter @gitiempo/api db:migrate` applies cleanly and `pnpm api:e2e:docker` migrates the isolated DB
- [x] 5.2 Extend the `firebase_identity_reservations.state` TS union and the `FIREBASE_IDENTITY_RESERVATION_STATES` constant with `resolved`; update the schema file, fake/real Firebase provider surfaces, and any state-matchers; verify `typecheck` passes
- [x] 5.3 Add a schema/migration unit test confirming existing `reserved`/`confirmed`/`bound` rows are unaffected and `resolved` is accepted; verify it passes

## 6. API — Operator recovery procedure

- [x] 6.1 Implement `resolveConclusivelyAbandonedRegistration(reservationId, operatorDecision, operatorIdentity)` under the shared identity locks: re-read reservation, re-check `state='reserved' AND purpose='registration'`, re-check the UID is not bound/adopted (`findUserByFirebaseSubject`, `firebaseSubjectBindings`); verify a unit test for the adopted/bound refusal case passes
- [x] 6.2 Add deterministic provider-absence confirmation (not a single user-not-found) via the `FirebaseAdminService` contract; update interface, real provider, and fake provider together per `apps/api/AGENTS.md`; verify the fake stays hermetic for `NODE_ENV=test`
- [x] 6.3 On conclusive abandonment, transition the reservation to `resolved` and write the `identity_recovery_audit` row (including the captured operator identity) in the same transaction; verify a unit test asserts both commits are atomic and the password is absent from the audit row
- [x] 6.4 Add unit tests for: uncertain outcome (single user-not-found, generic network/internal error) refusal; arbitrary SQL deletion refusal; provider creation completing after a lost response is preserved; verify all refusal cases retain the reservation as `reserved`
- [x] 6.5 Add a unit test asserting automated exact-UID recovery still completes/reuses the original foundation when `resolveConclusivelyAbandonedRegistration` exists; verify `recoverPendingRegistration` behavior is unchanged

## 7. API — Platform-operator endpoint surface (assess + resolve)

- [x] 7.1 Add a platform-operator guard mirroring the `WorkspaceAdminGuard` pattern but authorizing a platform-operator role (not workspace-admin); verify a unit test for authorized vs. rejected callers passes
- [x] 7.2 Add a controller with `GET` **assess** (aged unbound registration reservations, redacted, secret-free) and `POST` **resolve** (calls `resolveConclusivelyAbandonedRegistration` with the authenticated operator identity from the access token); verify both routes are guard-protected and non-operator callers get 401/403
- [x] 7.3 Add request/response DTOs wrapping shared Zod contracts (`createZodDto`); verify `pnpm --filter @gitiempo/api typecheck` passes and the DTOs redact all secret registration fields
- [x] 7.4 Regenerate `packages/shared/openapi.json` via the build-based workflow per `apps/api/AGENTS.md` (avoid `pnpm openapi:export` through `tsx` due to missing decorator metadata); verify the new operator endpoints appear and existing contracts are unchanged
- [x] 7.5 Add controller unit tests for assess (only aged unbound rows returned, redacted) and resolve (writes audit with operator identity, refuses uncertain/adopted cases); verify they pass

## 8. API — E2E and integration verification

- [x] 8.1 Add API E2E coverage in the isolated `gitiempo_e2e` database for: aged reservation assess endpoint, operator resolve of a conclusively abandoned reservation (audit row with operator identity), uncertain-outcome retention, and adopted-identity refusal; verify `pnpm api:e2e:docker` passes 412+ specs
- [x] 8.2 Run `pnpm --filter @gitiempo/api lint && typecheck && test` and confirm no new errors; run `pnpm test:e2e` for touched API/integration paths
- [x] 8.3 Confirm existing auth, invite, cross-provider race, rollback, and exact-UID recovery E2E suites still pass unchanged

## 9. Docs

- [x] 9.1 Document the operator recovery runbook: age threshold env key, how to call the assess + resolve endpoints (with `bruno/` examples), the conclusive-abandonment criteria, and the audit trail; verify the documented `bruno` requests run as written
- [x] 9.2 Document migration/deployment implications: the `identity_recovery_audit` table, the `resolved` state, the platform-operator role requirement, rollback steps (drop audit table, set `resolved` back to `reserved`); verify the rollback steps are reproducible
- [x] 9.3 Note the deferred follow-ups in the change docs: admin-web UI page for operator recovery and scheduled emission of the aged-reservation signal

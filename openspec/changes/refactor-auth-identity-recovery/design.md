# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- `apps/api/src/auth/services/auth.service.ts` (class `AuthService`, lines 213–1696) owns session issuance, social provisioning, manual-registration recovery, invitation identity coordination, the `firebase_identity_reservations` lifecycle, social bindings, and direct identity queries.
- `createSessionForMember` (579–619) and the private `createRegisteredSession` wrapper (880–889) are unused in production code. `createRegisteredSessionInTransaction` (985–1047) is the real path and is called directly by `register` and `recoverPendingRegistration`. `createSessionForMember` is referenced only in `auth.service.spec.ts` and as a mock in `auth-github.service.spec.ts`; GitHub login already goes through `provisionSocialSession`.
- Transaction-aware token issuance is duplicated: `provisionSocialSession` (547–554) and `createRegisteredSessionInTransaction` (1023–1030) insert `refreshTokens` manually instead of reusing `issueTokenPair` (785–810).
- `name`/`picture` vs `displayName`/`avatarUrl` aliases are normalized inline inside `resolveSocialUserInTransaction` (1459–1460, 1470–1474). `ProvisionSocialSessionInput` carries both alias families.
- The reservation table `firebase_identity_reservations` already stores `state` (`reserved`/`confirmed`/`bound`), `purpose`, `firebaseUid`, `normalizedEmail`, `createdAt`, `updatedAt`, and the non-secret registration foundation payload. It has no "age" or "resolved/abandoned" concept and no audit trail for operator actions.
- Automated exact-UID recovery (`recoverPendingRegistration`) and guarded compensation (`compensateKnownRegistrationFailure`, `deleteUnboundRegistrationReservation`) already enforce identity locks, adoption checks, and uncertain-outcome retention. The operator repair path must reuse these primitives, not bypass them.

Constraints from `apps/api/AGENTS.md`: extend the `FirebaseAdminService` contract / fake provider together; keep the fake hermetic for `NODE_ENV=test`; E2E uses the isolated `gitiempo_e2e` database.

## Goals / Non-Goals

**Goals:**
- Reduce `AuthService` maintenance risk by removing dead entry points, consolidating token issuance, and normalizing profile aliases once at the boundary.
- Add a deterministic, secret-free signal for aged unbound registration reservations.
- Define an audited operator recovery procedure for conclusively abandoned registrations that reuses the existing identity locks, reservation identity, and adoption checks.
- Preserve all current auth, invite, cross-provider race, rollback, and exact-UID recovery behavior.

**Non-Goals:**
- No change to ordinary Google/GitHub/password login, token claims, workspace selection, or the registration contract.
- No password/token persistence, Firebase credential mutation, or deletion of adopted identities.
- No new admin-web/user-web UI for operator recovery in this change; the operator surface is backend-internal (a service method plus audit/log) unless a later change adds an endpoint.
- No cross-app session transfer (tracked in #483) and no manual extra-workspace creation (#480).

## Decisions

### Decision 1: Remove dead entry points and consolidate token issuance
Remove `createSessionForMember` and `createRegisteredSession`. Route any remaining test-only assertions to `issueTokenPair` / `createRegisteredSessionInTransaction`. Extract a single transaction-aware `issueSession(tx, claims, membershipId, familyId)` helper wrapping `issueTokenPair` + `refreshTokens` insert, and call it from `provisionSocialSession`, `createRegisteredSessionInTransaction`, and `issueRegisteredSessionForExistingUser`.

- **Why:** eliminates duplicated `refreshTokens` inserts and two dead methods; keeps the canonical token-claims shape in one place.
- **Alternatives:** keep `createRegisteredSession` as a thin transaction wrapper. Rejected: it has no callers and the transaction wrapper is trivially inlined at the two call sites.

### Decision 2: Normalize `name`/`picture` at the social-provisioning boundary
Normalize `name`→`displayName` and `picture`→`avatarUrl` once at the top of `provisionSocialSession`, producing a canonical input shape before identity resolution. `resolveSocialUserInTransaction` then reads only `displayName`/`avatarUrl`.

- **Why:** removes parallel alias branches scattered across the resolve function; the alias compatibility exists only at the GitHub-OAuth profile boundary.
- **Alternatives:** keep aliases on `ProvisionSocialSessionInput` and normalize deeper. Rejected: pushes alias knowledge into the transactional core and keeps the duplication the issue calls out.

### Decision 3: Extract focused identity/reservation coordination without behavioral change
Move reservation lifecycle helpers (`reserve*`, `findReservation*`, `confirm*`, `reject*`, `bindSocialIdentityReservation`, `lockIdentityKeys`, `deleteUnboundRegistrationReservation`, `compensateKnownRegistrationFailure`) into a focused internal collaborator (e.g. an `IdentityReservationCoordinator` or a private module within the auth service). Keep the same lock ordering (`email:` then `uid:`), the same transaction ownership (caller passes `tx`), the same two-sided verified-email proof, and canonical UID behavior.

- **Why:** shrinks `AuthService` and isolates the reservation invariants the operator path must reuse.
- **Alternatives:** split `AuthService` into multiple injected services now. Rejected: larger blast radius; the issue asks for focused extraction, not a full service decomposition. Lock ordering and transaction ownership stay identical, so this is a move-only refactor.

### Decision 4: Aged unbound reservation observability — query + log event + on-demand endpoint, no scheduler
Implement the observability signal as a reusable query over `firebase_identity_reservations` selecting `purpose='registration' AND state='reserved' AND createdAt < now() - threshold`, with `threshold` from a validated env/config key. Emit a structured `logger.warn` event per aged reservation (redacted to normalized email + reserved UID + age). Expose the same query through the platform-operator **assess** endpoint (Decision 7) for on-demand inspection. Do not add an "age" column and do not introduce a scheduler dependency.

- **Why:** no schema migration and no new dependency; deterministic and secret-free; the reservation lifecycle is unchanged. The reusable query is the source of truth for both the on-demand endpoint and log-based alerting (Grafana/Loki are available in this environment), so a scheduled emitter can be added later as a deployment-runbook concern without code rework.
- **Alternatives:**
  - (a) Add `@nestjs/schedule` and a periodic emitter now. Rejected: no scheduler infrastructure exists in the API today; a new dependency for a low-frequency signal is unwarranted, and `.npmrc` `minimum-release-age=10080` can reject freshly-published versions.
  - (b) Add a dedicated `aged_at` column or a background sweeper that mutates state. Rejected: a state-mutating sweeper conflicts with the "uncertain outcome remains retained" guarantee; a derived signal is safer and reversible.
  - (c) On-demand query only, no log event. Rejected: purely reactive polling lets stranded registrations sit unnoticed; a structured log event lets existing alerting catch them proactively.

### Decision 5: Operator recovery — new `resolved` state + durable audit table (migration)
Add a new reservation state value `resolved` (the `state` column is `varchar`, so this is schema-compatible; update the TS union and fake/real provider surfaces together). Add a new `identity_recovery_audit` table (migration) recording: reservation id, normalized email, reserved UID, purpose, the non-secret registration foundation snapshot, the operator decision, the provider-absence evidence summary, and timestamps. The operator recovery method, under the shared identity locks:

1. re-read the reservation by id/UID and re-check `state='reserved'`, `purpose='registration'`;
2. re-check the Firebase UID is conclusively absent via the provider with a deterministic confirmation (not a single user-not-found);
3. re-check the UID is not bound or adopted by any committed local account (`findUserByFirebaseSubject`, `firebaseSubjectBindings`);
4. only then transition the reservation to `resolved` and write the audit row in the same transaction; free the email for re-registration by the `resolved` state being excluded from the email-ownership proof set.

Generic network/internal errors, a single user-not-found, and arbitrary SQL deletion never authorize the transition. Uncertain outcomes stay `reserved`.

- **Why:** preserves provenance (no row deletion) while unblocking re-registration for conclusively abandoned emails; the audit row satisfies the "audited operational recovery" acceptance criterion and keeps the password out of the record.
- **Alternatives:**
  - (a) Delete the reservation row on resolution. Rejected: loses provenance and auditability; the email unique index frees up but the history is gone.
  - (b) Log-only audit without a table. Rejected: logs are not durable enough for an operator action that changes identity state; a queryable audit row is required by the acceptance criterion.
  - (c) Reuse an existing state. Rejected: `bound` implies a local account exists; `confirmed` is a pre-binding intermediate; neither means "conclusively abandoned and resolved".

### Decision 6: Operator recovery reuses automated recovery primitives
The operator path calls the same `lockIdentityReservationKeys`, `findReservationByUid`, `findUserByFirebaseSubject`, and adoption checks as `recoverPendingRegistration` and `compensateKnownRegistrationFailure`. No new lock ordering, no credential mutation, no custom-token minting.

- **Why:** guarantees the operator path cannot delete an adopted identity or bypass two-sided proof.
- **Alternatives:** a separate parallel recovery routine. Rejected: duplicates the invariants the issue explicitly wants preserved.

### Decision 7: Platform-operator endpoint surface (assess + resolve) in this change; admin-web UI deferred
Add a new platform-operator guard + controller exposing two authenticated, admin-gated operations:
- **assess** — `GET` list of aged unbound registration reservations (Decision 4 query), redacted, secret-free.
- **resolve** — `POST` that runs `resolveConclusivelyAbandonedRegistration` (Decision 5) under the shared locks and writes the audit row with the **authenticated operator identity** taken from the access token.

The guard mirrors the existing `WorkspaceAdminGuard` pattern but authorizes a platform-operator role rather than a workspace-admin role. The admin-web UI page (new admin route, PrimeVue page, acceptance QA) and scheduled emission (Decision 4 alternatives) are explicit follow-ups; the endpoint is invokable via `bruno/` and is E2E-testable.

- **Why:** the acceptance criterion "an operator can safely assess and resolve" requires a real, authorized invocation path that captures who did it. A bare service method with no caller is dead code (unverifiable in E2E) and its audit "operator decision" has no authenticated source; direct-DB invocation bypasses locks, audit, and identity capture. An endpoint gives a real authorization boundary, a real operator identity for the audit, and E2E testability, while staying within the backend scope of #487.
- **Alternatives:**
  - (a) Service method + audit only, no endpoint (the prior default). Rejected: no caller means acceptance cannot be exercised and the operator identity cannot be captured; the audit is meaningless if the method is invoked by raw DB access.
  - (b) Full admin-web UI now. Rejected: frontend scope (new route, PrimeVue page, both frontend test suites per `AGENTS.md`); #487 is a backend refactor follow-up. The UI is a convenience layer over the endpoint.
  - (c) CLI script instead of an endpoint. Rejected: bypasses the NestJS auth/guard surface and the operator-identity capture; less auditable and harder to E2E-test than an authenticated endpoint.

## Risks / Trade-offs

- [Adding `resolved` state changes the reservation state machine] → Mitigation: update the TS union, fake/real Firebase provider surfaces, unit and E2E coverage in the same change; existing flows never set `resolved`, so behavior is additive.
- [Operator recovery could be mistaken for automated recovery] → Mitigation: distinct method, audit row, and a state value automated recovery never produces; automated exact-UID recovery still completes the foundation, while operator recovery only resolves a conclusively abandoned reservation.
- [Observability signal could be mistaken for an expiry sweeper] → Mitigation: the signal is read-only and documented as non-mutating; no background job changes reservation state.
- [Refactor extraction risks altering lock ordering] → Mitigation: extraction is move-only; add a regression test asserting lock key order and transaction ownership remain identical.
- [Positional mock removal could weaken assertions] → Mitigation: replace positional checks with assertions on reservation commits, lock acquisition, and atomicity outcomes, not argument positions.

## Migration Plan

1. **Schema migration (additive):** add `identity_recovery_audit` table; extend the `firebase_identity_reservations.state` documentation/union to include `resolved` (no column type change — it is `varchar`). Deploy migration before enabling the operator path. Rollback: empty the platform-operator allowlist and restart a compatible API release while preserving reservation states, the partial email index, and all audit rows. A pre-feature binary downgrade requires a tested compatibility backport for resolved history and uncertain creation outcomes.
2. **Code:** ship the refactor (decisions 1–3) and observability query + log event (decision 4) independently of the operator endpoint (decisions 5–7) so the no-behavior-change refactor can land and verify first.
3. **Contracts:** add operator-only request/response DTOs and OpenAPI entries for assess + resolve; regenerate `packages/shared/openapi.json` via the build-based workflow per `apps/api/AGENTS.md` (`pnpm openapi:export` through `tsx` lacks decorator metadata). Existing login/registration/token contracts are unchanged.
4. **Verification:** `pnpm --filter @gitiempo/api lint && typecheck && test`; API E2E in the isolated `gitiempo_e2e` database (`pnpm api:e2e:docker`); new unit/E2E coverage for the observability query, the assess/resolve endpoints, the `resolved` transition, audit row (with captured operator identity), and the uncertain-outcome/adopted-identity refusal cases.
5. **Deployment implications to document:** the new env key for the age threshold, the `identity_recovery_audit` table, the `resolved` state, the operator endpoint paths + required platform-operator role, and the operator runbook. Scheduled emission is a deployment-runbook/follow-up.

## Open Questions

- Admin-web UI page for operator recovery: deferred to a follow-up change (new admin route + PrimeVue page + acceptance QA). The backend endpoint in this change is the contract the UI will consume.
- Scheduled emission of the aged-reservation signal: deferred to deployment runbook / follow-up (external cron hitting the assess endpoint, or a future `@nestjs/schedule` integration). The reusable query + structured log event + on-demand endpoint in this change make scheduling a config/ops concern with no code rework.

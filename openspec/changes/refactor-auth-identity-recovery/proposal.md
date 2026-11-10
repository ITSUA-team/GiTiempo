# Proposal

## Why

[Issue #487](https://github.com/ITSUA-team/GiTiempo/issues/487) is the follow-up to #476 and PR #486. PR #486 hardened social sign-in identity handling and manual-registration recovery, but intentionally excluded the AuthService maintenance debt and the missing operational repair path for registrations whose Firebase creation outcome stays unresolved. AuthService now owns session issuance, social provisioning, manual-registration recovery, invitation identity coordination, reservation lifecycle, bindings, and direct identity queries in one ~1500-line class, with obsolete entry points, duplicated transaction-aware token issuance, and parallel `name`/`picture` vs `displayName`/`avatarUrl` aliases. A UID that was never created cannot use exact-UID recovery and repeated registration stays unavailable, so operators need an audited way to assess and resolve conclusively abandoned reservations while retaining uncertain outcomes.

## What Changes

- Remove the unused `createSessionForMember` and `createRegisteredSession` entry points and update obsolete tests/stubs that reference them.
- Extract focused identity/reservation coordination from AuthService without changing identity lock ordering, transaction ownership, two-sided verified-email proof, or canonical UID behavior.
- Consolidate transaction-aware token issuance and deterministic membership selection into shared internal paths; normalize `name`/`picture` versus `displayName`/`avatarUrl` once at the social-provisioning boundary instead of inline in identity resolution.
- Reduce positional mock coupling in auth tests while retaining meaningful assertions on reservation commits, locks, and atomicity.
- Add observability for aged unbound registration reservations so operators can detect reservations that stayed `reserved` past a configured threshold.
- Define an audited operational recovery procedure for conclusively abandoned registrations, reusing the same identity locks, reservation identity, and adoption checks as automated recovery. Preserve exact-UID authenticated recovery and the original non-secret registration intent; uncertain outcomes remain retained.
- Add a minimal backend platform-operator endpoint surface: an authenticated **assess** operation (list aged unbound registration reservations) and a **resolve** operation (run the audited recovery under the shared locks, recording the authenticated operator identity in the audit row). The admin-web UI page and scheduled emission are follow-ups.
- **No breaking changes** to login, token claims, workspace selection, or registration contracts. The public API surface gains new operator-only endpoints. No password/token persistence, Firebase credential mutation, or deletion of adopted identities is introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-model`: extend the recoverable identity-creation behavior with aged unbound registration reservation observability and an audited operator-initiated resolution path for conclusively abandoned reservations, preserving the existing exact-UID authenticated recovery and uncertain-outcome retention guarantees.

## Impact

- **Layer affected**: backend only (`apps/api`).
- **Code**: `apps/api/src/auth/services/auth.service.ts` (refactor + observability + recovery), a new platform-operator guard + controller (assess + resolve endpoints), related auth service specs (`auth.service.spec.ts`, `auth-github.service.spec.ts`), new endpoint specs, and any reservation repository/helper extracted. The admin-web UI page is a follow-up.
- **Contracts**: new operator-only request/response DTOs and OpenAPI entries for assess + resolve. Existing login/registration/token contracts are unchanged.
- **Auth behavior**: unchanged for ordinary Google/GitHub/password login, token claims, workspace selection, and original registration data. The new behavior is operator observability + recovery, not user-facing auth flow changes.
- **Deployment**: migration for the `identity_recovery_audit` table and the `resolved` reservation state; new env key for the age threshold; rollback steps documented. Operator endpoint is admin-gated; scheduled emission stays a deployment-runbook/follow-up.
- **Verification**: `apps/api` unit and E2E suites must continue to pass; new coverage for observability and the recovery procedure. See `apps/api/AGENTS.md` for the Firebase fake-provider and E2E database constraints.

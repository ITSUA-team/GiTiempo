# Tasks

Product decisions are confirmed. These are implementation tasks; no application implementation is included in this proposal.

## 1. API — reusable workspace names

- [ ] 1.1 Remove the normalized workspace-name unique index from the Drizzle schema and add a forward drop-index migration with generated metadata; verify migration on an existing database preserves workspace IDs/data and allows two `Workspace` rows.
- [ ] 1.2 Remove registration's workspace-name lookup, advisory lock, and constraint-conflict mapping while retaining email uniqueness and name shape validation; verify unit/E2E cases for duplicate names, duplicate email, invalid names, and registration rollback.
- [ ] 1.3 Verify admin rename accepts equal and normalization-equivalent names while non-admin mutation remains forbidden; land focused workspace E2E assertions and update the name/identity policy in `docs/DATA-MODEL.md`.

## 2. API — Google provisioning and membership coordination

- [ ] 2.1 Verify the Firebase decoded sign-in-provider field using current official documentation, expose it through the real/interface/fake adapters, and retain existing fake-token fixture meaning; verify deterministic Google/password adapter tests without real credentials.
- [ ] 2.2 Extract a transaction-aware workspace/session foundation from registration and add shared identity locks with a documented acquisition order; verify that workspace, settings, admin membership, refresh persistence, and token-signing failures roll back together in real-DB tests.
- [ ] 2.3 Implement canonical account resolution by UID and normalized verified email; route eligible Google zero-membership login through the foundation, preserve canonical UID/avatar ownership, and persist uniquely owned additional verified Firebase subjects without replacing the canonical UID, and reject contradictory subject/email owners without merging. Verify verified versus unverified email, new/existing accounts, multiple memberships, forged/unsupported providers, exact name, and default settings.
- [ ] 2.4 Add the durable identity-creation reservation schema, forward migration, and coordinator with unique email/UID, purpose, lifecycle state, and timestamps; commit reservations before explicit-UID Firebase creation and reconcile timeout/crash outcomes by reserved UID. Verify no email-only provenance, no UID reassignment, compatible concurrent retries, and conflict rejection without credential mutation.
- [ ] 2.5 Route invitation identity creation through the reservation coordinator and move acceptance's local upsert/membership into the shared lock protocol; verify new invitation provenance, safe legacy unbound-identity recovery, pending invite preservation, explicit later acceptance, and acceptance-first/social-first races.
- [ ] 2.6 Extend manual registration's identity critical section through Firebase creation and guarded compensation, and revalidate identity existence before new-user adoption after lock waits; verify both registration-first and social-first races cannot delete an adopted UID or create a local user for a deleted identity, and document guarded cleanup.
- [ ] 2.7 Add real-DB same-provider and cross-provider concurrency/retry coverage: Google-first/GitHub-first with one canonical UID per local account, simultaneous same verified email, different unbound Google UIDs that safely bind by verified email, and subjects already owned by another account. Assert one local account/workspace/settings/admin membership, existing workspace reuse, and unchanged membership-bound refresh rejection.
- [ ] 2.8 Add the additional Firebase-subject binding store/migration and extend live alternative-login checks for GitHub disconnect to proven canonical/additional subjects. Verify email changes cannot transfer subject ownership, canonical-versus-alias collisions fail, disabled/deleted providers cannot bypass disconnect safety, and JWT/refresh claims remain canonical. Smoke-test same-UID and different-UID Google/GitHub orders with the deployed Firebase configuration; conflicting owners receive safe recovery guidance.
- [ ] 2.9 Assert no inferred acknowledgement/email consent, preserved preferences, and no deletion of existing Firebase identities; document canonical verified-email policy, provenance/recovery, invitation separation, and non-consent in current API/product/data-model docs and run focused auth/invite suites.

## 3. API — GitHub candidate and session exchange

- [ ] 3.1 Extend callback resolution and staged handoff data to linked accounts, verified-email existing-account candidates, and new-account candidates; verify active-member matching/primary tie-break, zero-member reuse, verified-primary/sole-email selection, missing email, ambiguity, linked-owner precedence, and different-GitHub-ID conflict tests.
- [ ] 3.2 Use canonical bindings or the creation-reservation coordinator for GitHub exchange after initiator proof; verify proven invitation identity reuse, rejection/recovery for unknown legacy email matches, concurrent create reconciliation by reserved UID, and safe retry after SQL failure without deleting shared identities or losing provenance.
- [ ] 3.3 Refactor GitHub account persistence to participate in the shared provisioning transaction instead of requiring a pre-existing member; verify OAuth link/grant, workspace, membership, and session commit together and ownership/generation races leave no partial access.
- [ ] 3.4 Preserve callback staging and session-exchange security for new candidates; extend HTTP acceptance/E2E tests for abandoned callbacks, expired/replayed/stale handoffs (including a new candidate followed by competing account creation and disconnect), web cookie binding, extension verifier binding and configured redirect destinations, optional-scope sign-in, and App credential separation.
- [ ] 3.5 Update `docs/github-oauth-account-linking.md` and GitHub portions of `docs/API-ENDPOINTS.md` for candidate resolution, provisioning timing, failure recovery, and Firebase retry behavior; verify these documents agree with passing GitHub auth/account suites.

## 4. Shared — contracts and browser auth leaves

- [ ] 4.1 Retire `workspace_name_unavailable` from shared registration errors and API exports; verify shared schema/type tests accept the retained identifiers and duplicate-name registration succeeds without changing login/token-pair payloads.
- [ ] 4.2 Update shared GitHub error mapping for actionable verified-email/provisioning recovery and safe legacy no-member fallback; verify fetch/session-boundary tests cover normal provisioned token pairs and failed-exchange stale-state cleanup, without adding a new onboarding step.
- [ ] 4.3 Regenerate `packages/shared/openapi.json` using the documented build-based fallback when needed; verify its registration errors and successful auth shapes agree with shared schemas and review the generated diff for unrelated changes.

## 5. User-web — registration and social session behavior

- [ ] 5.1 Load frontend skills and auth UI docs, inspect approved login/register `.pen` frames, and remove obsolete workspace-name-conflict mapping from `useRegisterForm`; verify retained validation/error tests and record design parity for existing fields/actions/layout.
- [ ] 5.2 Add Google/GitHub provisioned-session and failure-recovery coverage through the existing user-web auth path; verify dashboard/bootstrap uses the returned workspace, no extra naming/owner-confirmation form appears, and no acknowledgement/email-consent payload is synthesized.
- [ ] 5.3 Update user auth documentation in `docs/ui/pages-user.md` for automatic social onboarding while retaining manual-register acknowledgement and separate invite acceptance; verify `pnpm --filter user-web test`, lint, and typecheck and review documented behavior against the tests.

## 6. Admin-web and extension — existing client compatibility

- [ ] 6.1 Add admin-web coverage for Google/GitHub provisioned admin sessions and unchanged role-based redirects for existing members; verify no new registration screen is introduced and run admin-web tests, lint, and typecheck with the approved login parity review.
- [ ] 6.2 Verify extension Firebase/Google exchange and GitHub proof-bound exchange can establish the provisioned session; add focused runtime/session tests and verify duplicate display names remain separate workspace-ID selections.
- [ ] 6.3 Update the current admin/extension auth documentation sections affected by provisioning; verify the text matches the passing client scenarios and run extension checks defined by its package scripts for any touched code.

## 7. Integration and specification verification

- [ ] 7.1 Run root `pnpm typecheck`, `pnpm lint`, and `pnpm test`, both frontend suites for shared auth changes, and `pnpm test:e2e` against migrated/seeded PostgreSQL; record outcomes for new/existing accounts, provider/invite races, duplicate-name create/rename, consent non-writes, and GitHub/session security regressions.
- [ ] 7.2 Complete an end-to-end smoke pass for user-web, admin-web, and the extension using new and existing social accounts; verify the visible `Workspace`, correct admin context, existing-member routing, separate invitations, and recoverable failed exchange.
- [ ] 7.3 Align changed main-spec purpose text that still says existing-members-only when synchronizing these deltas, review docs for stale global-name-uniqueness or login-never-provisions claims, and preserve archived decisions; verify a targeted text scan and spec review find no current contradictions.
- [ ] 7.4 Re-index changed application code with available repository graph tooling, obtain independent review of identity/concurrency and client behavior, and run `pnpm exec openspec validate auto-create-workspace-on-social-signin --strict`; resolve findings and verify migration-first deployment plus the non-destructive rollback described in the design are documented.

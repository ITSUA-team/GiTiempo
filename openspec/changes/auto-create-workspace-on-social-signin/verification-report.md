# Implementation verification

Date: 2026-10-26. Branch: `feat/476-auto-create-workspace-on-social-signin`.
Baseline: `eebe0520`; application changes are uncommitted.

## Status

Application implementation and automated verification passed. Independent security re-review approved the final code after three recovery/compensation findings were fixed. Real-provider/manual acceptance is pending, so the change remains active and is not ready to archive. OpenSpec progress: 27/42 complete; task 2.8 includes deployed Firebase smoke, 7.2 requires manual acceptance, 7.4 includes unavailable graph re-indexing, and all twelve section 8 items remain open.

## Implemented working-tree scope

- Forward migration `0024_right_sage.sql` removes workspace-name uniqueness and adds subject-binding/reservation stores. Migration `0025_misty_wolfsbane.sql` adds only nullable original manual-registration fields; generated snapshots/journal are included. Existing reservation IDs, UIDs, state, and purpose survive migration without fabricated provenance.
- Eligible social sign-in creates exactly one `Workspace`, default settings, and admin membership when no memberships exist. Existing memberships and canonical Firebase UIDs are reused; additional proven subjects have one owner. Equal workspace labels remain separate UUID identities.
- Email-only adoption requires incoming and existing verified ownership evidence. Google/GitHub cannot adopt an unverified password preclaim. GitHub callback proof-filters candidates and stages only; initiator-bound exchange commits OAuth, foundation, and session atomically.
- Manual registration commits its password-free exact-UID reservation before Firebase creation. Timeout/internal/network ambiguity retains original names/acknowledgement intent; background status updates never create local access. Authenticated exact-UID recovery rechecks live identity after locks and completes or reuses the original foundation. Guarded compensation cannot delete an adopted identity.
- Invitation provisioning and acceptance share identity coordination; ordinary social sign-in leaves invitations pending and infers no acknowledgement or email consent.
- Existing user/admin/extension session flows accept provisioned token pairs, preserve failure cleanup and workspace-ID selection, and remove the retired name-conflict error. No additional onboarding form or layout change was added.
- Refresh compare-and-swap loss produces authentication rejection rather than a leaked database rollback error.

## Fresh verification

| Check | Result |
| --- | --- |
| Root `pnpm typecheck` | Passed; 11/11 Turbo tasks after final test fixture updates. |
| Root `pnpm lint` | Passed; 11/11 tasks; existing frontend warnings remain. |
| Root test-script components | `pnpm exec turbo run test --concurrency=1` passed 11/11 tasks; `node --test .github/scripts/detect-ci-targets.test.mjs` passed 5 tests. Components are the root script with bounded Turbo concurrency. |
| API unit suite | 44 files / 602 tests passed. |
| User-web / admin-web | 53 files / 571 tests and 79 files / 747 tests passed; existing jsdom canvas warnings. |
| Shared contracts / browser auth / config | 534 / 238 / 18 tests passed. |
| Extension | 12 files / 248 tests passed. Its check/typecheck/lint and Chrome/Firefox builds passed in the earlier unchanged-client verification. |
| Build-based `pnpm openapi:export` | Passed; generated auth/token contracts unchanged. |
| Dedicated PostgreSQL API E2E | All 32 files / 400 tests passed using the guarded direct API runner. |
| Drizzle `db:check` | Passed; generated migration metadata consistent. |
| Strict validation for this OpenSpec change | Passed. |
| Main-spec merge | All eight affected capabilities validate. Global main-spec validation remains 50/52 due to pre-existing unrelated errors in `chrome-extension` (delta header inside main spec) and `user-activity-tracking` (missing Purpose). |
| Independent security review | Three HIGH findings resolved and re-reviewed; final concurrent-recovery delta approved, no remaining blocking finding. |
| `git diff --check` | Passed. |

Real PostgreSQL coverage includes duplicate-name migration/create/rename, same-provider and cross-provider races, additional-subject conflicts, invitation ordering, GitHub handoff security and permission isolation, transaction rollback, membership-bound refresh denial, manual timeout/late success/late rejection, ambiguous immediate rejection after remote creation, immutable absent-UID provenance, exact-UID unverified-password recovery, durable restart-like recovery without an active promise, existing-foundation reuse, and migration 0025 preservation. Provider behavior is deterministic fake Firebase; deployed Firebase behavior is not established by these tests.

Independent review and unit regressions verify guarded cleanup skips adopted/bound identities, live Firebase rejection after locking creates no foundation/session, unknown outcomes preserve reservations, and unexpected UIDs are never deleted without provenance. Earlier client review approved the affected user/admin/extension flows after missing tests were added. The approved login/register `.pen` frames were inspected; existing visual deltas are listed in the manual report.

Repository graph tools (`index_repository`, `index_status`, coverage and graph search) are unavailable in this session; no re-index or graph-coverage claim is made. Migration-first deployment and non-destructive rollback are documented in `design.md`.

## Database incident and manual coverage

An initial root E2E invocation lost the dedicated connection through Turbo's strict environment filtering and reached the ordinary development database. The leftover test trigger was identified and removed; no remaining matching registration test trigger was found. Existing GitHub-link timestamps were unchanged. Full absence of data changes cannot be established without a pre-run snapshot. See [manual-test-report.md](./manual-test-report.md) for the exact known impact and limits.

Later E2E runs use the direct API runner with the explicit dedicated connection. The user completed real Google sign-in in user-web. The dedicated database confirms real Google and GitHub exchange foundations: the providers use different emails and each has one distinct `Workspace`/admin/UTC foundation. Full manual acceptance remains open, including matching-email provider order, repeat/reload UI details, and the other clients. The user's existing development GitHub link was not disconnected. Earlier temporary servers were stopped; the current dedicated API (3000) and user-web (5173) are running for the active manual check. The temporary in-app tab was closed. See the manual report for recorded IDs and tested application snapshot.

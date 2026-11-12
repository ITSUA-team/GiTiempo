# Tasks

## 1. Preflight and API boundary

- [x] 1.1 Compare this change's MODIFIED blocks with the current main specs and the four predecessor sources listed in design decision 6; rebase only this change's deltas if necessary, and record the source revisions and required synchronization order in `design.md`.
- [x] 1.2 Recheck inventory U1-U14, A1-A14, and K1-K10 against the implementation revision; record any moved, already-absent, or newly discovered emission with its remove/retain reason and verify every production success/info family is accounted for.
- [x] 1.3 Inspect the approved `.pen` frames listed in the design and record a concrete checklist for affected success, error, busy, connection, and dialog states; verify desktop/mobile expectations before production edits and explicitly record any unavailable design surface.
- [x] 1.4 Confirm that existing API responses and request ownership support the inventory without backend, authorization, contract, or dependency changes; verify the implementation scope excludes #498/#499 and record existing request baselines for the affected flows.

## 2. Shared feedback and canonical documentation

- [x] 2.1 Review `packages/web-shared/src/feedback.ts` and its existing tests before call-site edits; verify success/info remain usable for exceptions, errors retain their logging/dismiss behavior, and `runWithFeedback` supports omitted success copy without losing its error path. Add focused regression coverage only where those contracts lack coverage.
- [x] 2.2 Update notification policy in `docs/ui/patterns.md` and the matching clauses of `.agents/skills/gitiempo-frontend-rules/SKILL.md`; verify routine visible success is quiet, explicit exceptions remain, and root Toast/ConfirmDialog ownership and error conventions are consistent with `frontend-notifications`.
- [x] 2.3 Verify shared consumers after the app slices below: both SPAs retain meaningful success/info exceptions and unchanged error behavior, with no global severity filter, replacement feedback abstraction, extra request, or new dependency; run shared feedback tests if they changed and both frontend suites for any shared helper edit.

## 3. User SPA

- [x] 3.1 Before changing U1-U6 and U14, add or update focused regressions for quiet task/time-entry CRUD, task creation/selection, top-bar start/stop/reassignment, and direct timer controls; verify the intended quiet-success assertions fail against current emissions while state, request-count, and failure baselines remain meaningful.
- [x] 3.2 Remove routine task/time-entry CRUD and task-creation emissions at U1-U3; verify authoritative rows and selected tasks update, dialogs close/reset as before, existing reconciliation requests remain, and backend conflicts/errors preserve drafts and retry behavior.
- [x] 3.3 Remove routine top-bar timer emissions and the already-stopped notice at U4/U14; verify timer/selection state, successful idempotent return value, reconciliation, pending guards, changed-timer guidance, and stop-first recovery through focused tests.
- [x] 3.4 Remove direct timer success emissions at U5/U6; verify Projects plus both Dashboard and Time Entries consumers update visible/shared timer state and retain stale-target protection, errors, disabled guards, and unchanged request counts.
- [x] 3.5 Before changing U7-U9, extend Profile feature/view regressions for quiet identity save and unlink, callback success/error/unknown or missing code, unsupported query values, and callback-success-followed-by-status-read-failure; verify URL cleanup, authoritative card state, error/retry, confirmation, and revocation feedback are asserted.
- [x] 3.6 Remove profile-save and ordinary disconnect success emissions while retaining their owning callbacks; verify saved identity and refreshed disconnected state, failure recovery, confirmation, and the unconfirmed-provider-revocation exception.
- [x] 3.7 Separate supported callback recognition/cleanup from toast selection and suppress only its success notification; verify handled success/error parameters are removed with `router.replace`, unsupported values retain existing handling, and failed status loading shows request-error/retry without an extra read or fabricated connection state.
- [x] 3.8 Before changing U10-U13, extend auth/invite regressions for quiet forgot-password, password-setup, accepted/already-member outcomes and redirect, plus retained reset success; verify account-safe known/unknown-email copy, token/context cleanup, validation, provider errors, and accepted-but-session-failed recovery.
- [x] 3.9 Remove duplicate forgot/setup/accept toasts and the transient invite redirect notice; verify persistent instructions and continuation actions, `isRedirecting`/busy/disabled guards, existing login/navigation destinations, and partial-success recovery remain functional.
- [x] 3.10 Verify User retained exceptions K1-K3 and K6-K10 through focused tests: workspace-switch partial refresh failure, changed-timer retry/stop-first, backfill counts, reset completion, provider errors, and persistent status/instruction surfaces remain available without added notifications.
- [x] 3.11 Update affected notification clauses in `docs/ui/pages-user.md` and attach User test/evidence references to the inventory; verify the page guidance agrees with the new policy and run the User suite, typecheck, and lint for the completed slice.

## 4. Admin SPA

- [x] 4.1 Before changing A1-A8, extend project/member regressions for quiet creation/edit/archive/unarchive, assignment/permission/removal, invite creation/cancellation, and retained rename/backfill/resend exceptions; verify state, confirmation, form/dialog lifecycle, failures, and request budgets are asserted.
- [x] 4.2 Remove ordinary project create/edit/archive/unarchive success emissions at A1-A3; verify list/navigation updates, existing edit callbacks and backfill dialog, destructive confirmation, failure recovery, and the explanatory automatic-rename notification.
- [x] 4.3 Remove assignment, invoice-permission, and removal success emissions at A4-A6; verify persisted state/counts, collapse/refresh, confirmation, authorization/error behavior, and no role-edit implementation is invented to satisfy an obsolete toast clause.
- [x] 4.4 Remove initial-invite and cancel success emissions at A7/A8 while retaining resend acknowledgement; verify pending rows/counter, dialog closure, cancel confirmation, resend failure, and copy that makes no email-delivery guarantee.
- [x] 4.5 Before changing A9, extend invoice create/detail/status/delete regressions; verify visible authoritative data, title/notes dirty flags including pending edits, status-only behavior, post-delete navigation, permissions/conflicts/errors, loading guards, and quiet-success assertions.
- [x] 4.6 Remove invoice success emissions without deleting functional success callbacks; verify creation updates the list, saves clear only the appropriate dirty flags, status transitions preserve editing semantics, and deletion navigates only after success.
- [x] 4.7 Before changing A10/A11, extend saved-report and workspace-settings regressions; verify preset create/save/rename/delete state and dirty baselines, settings/workspace label updates, failure/draft recovery, and existing request counts including no replacement report-collection reads.
- [x] 4.8 Remove saved-report and settings success emissions; verify selection, dirty baselines, authoritative settings, cancel/reset behavior, and errors remain correct through the focused suites.
- [x] 4.9 Before changing A12/A13, extend GitHub organization and App-setup regressions for automatic, manual, and callback completion including verification/follow-up-read failures; verify card state, cleanup, scope checks, pending guards, and existing error/retry feedback.
- [x] 4.10 Remove organization add/remove and App-access-confirmed success emissions; verify the authoritative card/list communicates completion, every completion path retains callback/selection cleanup, and failed follow-up reads remain visible without confirmed-access claims or extra requests.
- [x] 4.11 Before changing A14 or export copy, extend Admin password/export regressions; verify quiet known/unknown-email recovery with its persistent panel, retained reset success/login redirect, truthful ready/download-started acknowledgement, and generation/provider failures.
- [x] 4.12 Remove the duplicate forgot-password toast and make the retained export acknowledgement explicitly say export ready or download started without claiming disk completion; verify existing download behavior, reset completion, account-safe instructions, validation, and errors remain intact.
- [x] 4.13 Verify Admin retained exceptions K1/K3-K10 through focused tests, update notification clauses in `docs/ui/pages-admin.md`, and attach Admin evidence to the inventory; run the Admin suite, typecheck, and lint and verify the guidance matches the implemented decisions.

## 5. Integration and acceptance

- [x] 5.1 Run root `pnpm typecheck`, `pnpm lint`, and `pnpm test`; verify both SPA suites and any changed shared tests actually execute, record results, and resolve any failures introduced by this change.
- [x] 5.2 Run representative real User pages on desktop and below 640px through CRUD/timer success, failure/retry, Profile callback cleanup, and invite/auth completion; verify quiet visible results, layout stability, request budgets, and retained exceptions against the inventory and approved-frame checklist.
- [x] 5.3 Run representative real Admin pages on desktop and below 640px through project/member/invoice/preset/settings mutations and automatic/manual/callback App setup; verify quiet state changes, invoice dirty-state/navigation, error/retry, export/resend/backfill/rename exceptions, and unchanged request budgets.
- [x] 5.4 Check keyboard behavior and rendered accessibility semantics in representative changed dialog, timer, connection, and auth flows; verify focus restoration, busy/disabled semantics, useful completion/error exposure, and no assertive per-second timer or generic replacement alerts. Record reset hard-navigation toast visibility as the documented existing limitation. Native screen-reader testing is excluded by the owner's 2026-11-06 scope decision.
- [x] 5.5 Verify representative desktop/mobile layout stability in both SPAs after notification removal: no reserved blank notice space, broken field/action layout, or horizontal overflow introduced by this change. Consolidate existing real-page evidence with revision/environment, expected/actual results and limitations; retain reuse/PrimeVue review findings. Full approved-frame pixel parity is excluded by the owner's 2026-11-06 scope decision; do not claim it passed.
- [x] 5.6 Complete the U/A/K inventory with final file/test/acceptance evidence, verify all removed/retained sites and new discoveries have reasons, and review the final diff for request/contract changes, lost handlers, hidden errors, or unintended persistent-status removal.
- [x] 5.7 Recheck effective main/predecessor requirements and this change's deltas, then run `pnpm exec openspec validate reduce-redundant-spa-notifications --strict`; verify schema validity and separately record whether each predecessor base required for synchronization exists, without treating structural validity as synchronization readiness.
- [x] 5.8 Perform manual regression testing in a real browser for both SPAs on desktop and mobile, covering the scenarios in 5.2-5.4: ordinary success without redundant notifications, visible state updates, errors/retry, loading/disabled controls, destructive confirmations, navigation, callback cleanup, and every retained exception K1-K10 in its applicable app. Record results in this change's `manual-test-results.md` with steps, expected/actual behavior, browser/viewport, revision/environment, PASS/FAIL/BLOCKED, and screenshots or other evidence; verify failures are resolved and rerun, and explicitly document any blocked scenarios rather than marking them passed.

## Review follow-up

- [x] 6.1 Expose installation-status request errors and scoped Retry in the GitHub Workspace Access card; verify one explicit read, duplicate-click protection, callback cleanup, and no repeated setup/completion. Recheck in the real local Admin page and record evidence.

## Workflow follow-up

- Synchronize the named predecessor bases only through their normal workflow with sufficient evidence; never check off or archive unfinished predecessor work to unblock this change.
- Synchronize this change after those bases exist and review the effective combined policy, including the `improve-spa-data-refresh` ordering that must not restore blanket success-toast preservation.
- Archive this change only after its own implementation, review, and acceptance tasks are complete; verify the archived result through the normal archive workflow.

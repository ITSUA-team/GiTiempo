# Proposal

## Why

Routine successful actions in User and Admin SPA repeat results that are already visible through updated rows, forms, selections, and timer state. These notifications interrupt work, and transient inline notices can move page content; issue [#513](https://github.com/ITSUA-team/GiTiempo/issues/513) requests quieter feedback while preserving actionable failures and essential instructions.

## What Changes

- Establish a cross-SPA notification policy: ordinary successful actions and background refreshes stay quiet when the existing surface communicates the result accessibly; retain messages that explain an otherwise unavailable result, partial failure, recovery action, or next step.
- Remove redundant task/time-entry/timer/profile, project/member/invoice/settings, saved-report, and organization-management success notifications. Remove duplicated auth-flow success toasts and the transient invitation-redirect notice while retaining persistent instructional panels and busy controls.
- Keep workspace-switch partial-failure guidance, changed-timer recovery instructions, billable-backfill counts, automatic project-rename explanations, invitation-resend acknowledgement, password-reset completion with its existing login redirect, and export-start acknowledgement.
- Handle GitHub success callbacks quietly while preserving query cleanup, authoritative status loading, callback errors, and request-error/retry states. Silence automatic GitHub App reconciliation; manual/callback completion uses the refreshed access card rather than a redundant success toast.
- Preserve validation, errors and error logging, retry/recovery, loading and disabled guards, destructive confirmations, mutation reconciliation, navigation, and request counts. Do not globally disable success/info helpers.
- Record a remove/retain inventory, replace obsolete toast assertions with quiet-success plus visible-state assertions, and align UI documentation, project frontend guidance, and conflicting capability requirements.

## Capabilities

### New Capabilities

- `frontend-notifications`: Cross-SPA selection of quiet routine outcomes, meaningful notification exceptions, preserved failure/accessibility behavior, and regression/acceptance evidence.

### Modified Capabilities

- `user-pages`: Quiet time-entry edits, profile saves/GitHub success callbacks and disconnects, and Dashboard timer success; preserve request errors and callback cleanup.
- `user-projects-list-page`: Quiet task deletion and direct timer success while preserving authoritative state and recovery guidance.
- `admin-members-page`: Quiet creation/cancellation of invites and ordinary member/assignment/permission mutations; retain resend acknowledgement and errors.
- `admin-projects-page`: Quiet project edit/archive/unarchive; retain the automatic-rename explanation and bulk-update counts.
- `admin-settings-page`: Quiet saves with authoritative form reconciliation and unchanged failure recovery.
- `admin-pages`: Quiet GitHub organization policy changes with visible list reconciliation.
- `add-project-page`: Quiet creation/import followed by the existing Projects navigation.
- `frontend-server-state-composables`: Make notification behavior follow the new policy without changing query, refresh, or error ownership.
- `frontend-password-recovery`: Keep the persistent, account-safe email-request confirmation without its duplicate toast; retain reset-completion toast and failure behavior. This capability is currently introduced by `add-password-recovery`.
- `admin-invoices-page`: Quiet invoice creation/update/deletion while retaining dirty-state cleanup, navigation, loading, conflicts, and errors. This capability is currently introduced by `add-admin-invoices-ui`.

## Impact

- Layers: frontend apps, frontend documentation/guidance, and OpenSpec requirements. Audit shared frontend feedback helpers, but no shared production API change is required.
- No backend, database, OpenAPI, shared API-contract, dependency, authentication-protocol, permission, or invoice-calculation change. Auth notification presentation changes only; token handling, redirects, and recovery semantics remain intact.
- Follow-up to #496, which deliberately preserved notification behavior. Keep authorization fixes in #498/#499 and unfinished work in other changes separate.
- Spec integration depends on the relevant source requirements from `add-password-recovery`, `add-admin-invoices-ui`, and `add-pm-invoice-view-permission`. The included MODIFIED deltas use those existing change artifacts where main specs do not yet contain the requirements. Rebase against current source artifacts before implementation; synchronize predecessor requirements before this change's deltas, without falsely completing or archiving unfinished changes.
- Planning only: implementation, browser acceptance, and changes to current main specs or other change directories are not performed by this proposal.

## 1. Source And Contracts

- [x] 1.1 Review `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `GITiempo.pen` for the TopBarTimerTaskDialog parity checklist before UI edits.
- [x] 1.2 Extend `startTimerSchema` and exported start-timer types in `packages/shared/src/contracts/time-entries.ts` to accept optional nullable `description` with the existing time-entry description length limit.
- [x] 1.3 Add shared-contract tests that cover timer start with no description, string description, `null`, unknown fields, and over-limit descriptions.
- [x] 1.4 Update API DTO/OpenAPI-facing types generated from the shared timer start contract.

## 2. Backend API

- [x] 2.1 Persist optional start-timer `description` when creating a `web` running time entry.
- [x] 2.2 Change own-entry update service behavior so running entries accept only `taskId` and/or `description` and keep rejecting `startedAt`, `endedAt`, `isBillable`, and deletes.
- [x] 2.3 Preserve existing ownership, visible-project, active-task, inactive-work, duration, and single-running-timer rules for all timer start and running update paths.
- [x] 2.4 Add backend tests for start-with-description, running task/description update, running description clear, running interval/billable rejection, invisible task rejection, and inactive task rejection.
- [x] 2.5 Regenerate and review `packages/shared/openapi.json` with the repository-approved OpenAPI export workflow.

## 3. User Web

- [x] 3.1 Update the user-web time-entry client and query mutation boundaries so timer start submits a `StartTimerInput` object and running timer updates reuse the existing update-entry mutation.
- [x] 3.2 Add description draft state to the top-bar timer picker, including blank idle defaults, running-timer prefill from `currentTimer.description`, whitespace-to-null submit normalization, and close/reset behavior.
- [x] 3.3 Add the PrimeVue `Textarea` Description field to `TopBarTimerTaskDialog` directly below Task, preserving approved desktop/mobile order, spacing, footer order, loading, and disabled states.
- [x] 3.4 Update top-bar timer actions so idle Start sends the selected task plus description, and running `Use selected task` saves task/description to the active entry without stopping the timer.
- [x] 3.5 Reconcile local current-timer state and relevant query caches from authoritative API responses after start, stop, and running updates; refresh authoritative state on conflicts.
- [x] 3.6 Add user-web tests for dialog rendering/emits, idle start payloads, running update payloads, clearing descriptions, retryable failures, and desktop/mobile task-picker layout expectations.

## 4. Verification

- [x] 4.1 Run OpenSpec validation for `add-top-bar-timer-description-support`.
- [x] 4.2 Run shared contract build/tests for the changed time-entry contract.
- [x] 4.3 Run `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [x] 4.4 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [x] 4.5 Perform a final parity review against `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `GITiempo.pen`, noting any PrimeVue-only deviations.

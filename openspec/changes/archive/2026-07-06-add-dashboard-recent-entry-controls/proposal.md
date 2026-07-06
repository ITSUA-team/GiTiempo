## Why

GitHub issue #281 requests direct controls on Dashboard recent time-entry items so users can start a fresh timer from a completed recent entry or stop the active running entry without navigating to Time Entries. The current OpenSpec contracts still describe Dashboard timer control as top-bar-only, so the requirements need to be updated before implementation is treated as spec-compliant.

## What Changes

- Dashboard Recent Time Entries rows and mobile cards expose a first-column icon-only direct timer action.
- Completed recent entries show `Start timer` for the entry's task and create a fresh running time entry through the existing timer start flow.
- The active running recent entry shows `Stop timer` and stops only the currently authoritative running timer after guard validation.
- Dashboard keeps the global top-bar timer as the main timer surface and does not add a separate dashboard timer widget or panel.
- Dashboard recent-entry controls reuse the Time Entries row/card timer action behavior, including disabled and pending states.
- Dashboard overview client-boundary requirements are revised to allow the narrow timer lifecycle methods needed for these controls while still avoiding unrelated task-management mutations.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Allow direct Dashboard Recent Time Entries row/card timer actions while preserving global top-bar ownership for the standalone timer surface.
- `user-projects-list-page`: Revise the dashboard overview client-boundary regression requirement so Dashboard may depend on narrow timer lifecycle methods without depending on unrelated project/task mutation APIs.

## Impact

- Affected app: `apps/user-web` Dashboard overview and recent entries components.
- Affected shared frontend leaf: reusable time-entry timer action component behavior/types may need to accept Dashboard recent-entry timer payloads.
- Affected composables: Dashboard overview must wire direct timer actions, current-timer guard state, mutation pending state, and recent-entry reload/reconciliation.
- API/contracts: no new backend endpoints or shared Zod contracts; use existing `GET /time-entries/current`, `POST /time-entries/timer/start`, and `POST /time-entries/timer/stop` client methods.
- UI docs/specs: update Dashboard and responsive record-list requirements to describe the new controls and clarify the top-bar ownership boundary.
- Tests: add/adjust desktop and mobile component tests plus dashboard/composable wiring tests for start, stop, disabled, pending, and stale-running-entry guard behavior.

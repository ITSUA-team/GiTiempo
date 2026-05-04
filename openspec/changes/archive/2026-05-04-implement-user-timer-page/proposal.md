## Why

The user-web Timer route is currently a placeholder even though the backend already exposes the local project/task timer APIs needed for MVP time tracking. Implementing this page lets authenticated users start, stop, and manually log time from visible workspace projects and tasks using the approved Timer Page design.

## What Changes

- Replace the user-web Timer placeholder with the approved Timer Page UI from `GITiempo.pen`.
- Provide a local `Project -> Task` selector backed by the current user's visible workspace projects and tasks.
- Show the current running timer, elapsed `HH:MM:SS` display, selected task summary, and a singular large CTA that reads `Start` when no timer is running and `Stop` when a timer is running.
- Add a manual interval entry panel below the timer actions with date, start time, end time, and add-entry action.
- Use existing API contracts for projects, tasks, current timer, timer start/stop, and manual time-entry creation.
- Do not introduce external-provider task selection, freeform manual fallback, or pause/resume behavior in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Update the Timer Workflow Page requirement to use visible workspace `Project -> Task` selection, running timer controls, and manual interval entry behavior matching the current docs and approved design.

## Impact

- `apps/user-web/src/views/TimerView.vue` will become the concrete Timer Page implementation.
- `apps/user-web` may gain small app-local API client helpers for projects, tasks, and time entries.
- Existing backend endpoints and shared contracts are reused; no API shape changes are expected.
- Verification should include user-web lint and typecheck, with focused tests if timer helper logic is extracted into testable units.

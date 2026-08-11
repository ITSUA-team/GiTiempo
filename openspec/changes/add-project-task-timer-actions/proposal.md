## Why

Members can start tracking from an existing task on Time Entries and Dashboard, but the Projects page makes them leave the task list and reopen the global timer flow. Adding the same direct timer affordance beside each project task removes that unnecessary navigation and keeps timer behavior consistent across user-facing task lists.

## What Changes

- Add a task-specific timer action beside each task name in Projects desktop rows and mobile cards.
- When no timer is running, the action starts a fresh timer for that task without opening the task-picker dialog.
- When the row represents the task currently being tracked, the action becomes `Stop timer` and stops the authoritative running entry.
- When another task or workspace already owns the running timer, direct starts are blocked and activating the control opens the existing top-bar stop-first guidance instead of sending a conflicting request.
- Reuse the existing Time Entries timer-action presentation and timer-query/mutation boundaries; keep success, failure, loading, and stale-authoritative-state behavior consistent with existing direct timer actions.
- Make timer stopping identity-bound so a stale Projects control cannot stop a replacement timer started elsewhere.
- Update the approved Projects design before implementation and verify both desktop-table and mobile-card parity. The current checked-in `GITiempo.pen` does not expose the GiTiempo Projects/Time Entries screens, so design restoration or replacement is an explicit prerequisite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-projects-list-page`: Project task rows and mobile cards gain direct start/stop timer behavior, conflict guidance, and task-specific accessible labels.

## Impact

- `apps/user-web/src/components/projects/ProjectsTaskSection.vue` and its component tests.
- `apps/user-web/src/views/ProjectView.vue` and focused view/integration tests for timer state wiring.
- A small reusable user-web timer-action leaf currently owned by the Time Entries surface, plus Projects-specific timer orchestration built on the existing current-timer/start/stop query mutations.
- `docs/ui/pages-user.md` and the approved GiTiempo `.pen` Projects screen.
- Extend the existing stop-timer contract with the expected running entry id. Current clients conditionally stop that exact active timer and receive `409 Conflict` when it has changed; bodyless legacy extension clients remain temporarily compatible. No database migration or dependency change is required.

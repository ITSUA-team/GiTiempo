## 1. Backend Contract

- [x] 1.1 Allow task-only reassignment for own running time entries through the existing own-entry update endpoint.
- [x] 1.2 Keep mixed running-entry updates, non-task running-entry updates, and running-entry deletes rejected until stop.
- [x] 1.3 Validate replacement tasks with existing visibility and active-work rules.

## 2. User-Web Timer

- [x] 2.1 Preselect the running timer's current task when opening the top-bar task picker.
- [x] 2.2 Confirming a different task while the timer is running updates the running entry task and refreshes authoritative timer state.
- [x] 2.3 Failed running-task updates keep the picker open, show inline error feedback, and avoid switching visible current task.
- [x] 2.4 Disable conflicting primary timer actions while a running-task update is pending.

## 3. Verification

- [x] 3.1 Add backend unit and e2e coverage for task-only running-entry reassignment and rejected running-entry mutations.
- [x] 3.2 Add user-web timer composable coverage for preselection, successful reassignment, same-task confirmation, failures, conflict refresh, and stale async response handling.
- [x] 3.3 Run focused user-web timer tests, user-web typecheck, and user-web lint.

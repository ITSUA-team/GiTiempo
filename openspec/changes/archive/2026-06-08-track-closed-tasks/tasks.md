## 1. Task Trackability Contract

- [x] 1.1 Add or update backend task-trackability checks so closed tasks return 422 for tracking target writes.
- [x] 1.2 Ensure project activity, task activity, task visibility, and closed status use consistent errors across manual entry, timer, extension timer, and reassignment flows.
- [x] 1.3 Share duration calculation for completed time entries without changing existing positive-duration semantics.

## 2. Transactional Timer Reconciliation

- [x] 2.1 Update task close flow to lock the task row before applying a `closed` status transition.
- [x] 2.2 Stop all running entries for the closed task inside the same transaction.
- [x] 2.3 Use a bulk update for task-close timer reconciliation and guarantee positive `durationSeconds`.
- [x] 2.4 Validate manual entries, web timer starts, GitHub extension timer starts, and task reassignment inside write transactions using task row locks.

## 3. Tests

- [x] 3.1 Add API unit coverage for closed-task trackability rejection.
- [x] 3.2 Add API unit coverage for task close stopping running entries.
- [x] 3.3 Add API unit coverage for transactional validation in manual entry, web timer, GitHub extension timer, and reassignment paths.
- [x] 3.4 Add or update API e2e coverage for closed-task manual entry rejection, timer start rejection, extension timer rejection, and current-timer reconciliation after task close.

## 4. Documentation And Verification

- [x] 4.1 Update API endpoint documentation to describe the task-close timer side effect.
- [x] 4.2 Run `pnpm --filter @gitiempo/api lint`.
- [x] 4.3 Run `pnpm --filter @gitiempo/api typecheck`.
- [x] 4.4 Run `pnpm --filter @gitiempo/api test`.
- [x] 4.5 Run relevant API e2e tests after migrated and seeded Postgres is available.
- [x] 4.6 Run `openspec validate track-closed-tasks --strict`.

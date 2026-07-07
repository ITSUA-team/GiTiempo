## 1. Context And Contract Review

- [x] 1.1 Read `apps/user-web/AGENTS.md`, `apps/api/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/pages-user.md`, and `docs/ui/patterns.md` before implementation.
- [x] 1.2 Inspect the approved `GITiempo.pen` top-bar timer/mobile timer strip/task-picker screens and record the parity checklist for cross-workspace running state copy, spacing, and action hierarchy.
- [x] 1.3 Verify the current backend behavior for `GET /time-entries/current`, `POST /time-entries/timer/stop`, and `POST /time-entries/timer/start` when the user's running entry belongs to another workspace.
- [x] 1.4 Decide whether the existing `TimeEntryResponse.workspaceId` plus available membership data is sufficient for the workspace label, or whether the shared time-entry contract needs safe workspace display metadata.

Review notes: Direct `GITiempo.pen` inspection was attempted through Pencil MCP but failed because no editor file is open. The parity checklist falls back to the checked-in UI docs: desktop compact timer stays content-width and avatar-aligned, mobile keeps the left `Task & timer` opener, task-picker keeps Project -> Task -> Description order, and cross-workspace running state makes popup-owned `Stop timer` the primary recovery action while active-workspace selection/change controls are unavailable. Backend review found current/stop are workspace-scoped, start remains active-workspace-scoped with user-global running conflict, and a shared safe `workspace` response summary is needed for human-readable labels.

## 2. Backend And Shared Contract

- [x] 2.1 Update `GET /time-entries/current` so it returns the authenticated user's running entry across workspaces instead of only the active workspace, if current behavior is workspace-scoped.
- [x] 2.2 Update `POST /time-entries/timer/stop` so it stops the authenticated user's running entry across workspaces instead of only the active workspace, if current behavior is workspace-scoped.
- [x] 2.3 Preserve `POST /time-entries/timer/start` active-workspace task visibility checks and `409 Conflict` behavior when any running timer already exists for the user.
- [x] 2.4 Add or update safe workspace display metadata in `packages/shared/src/contracts/time-entries.ts` only if needed for `Running in <workspace>` UI copy.
- [x] 2.5 Add focused API service/controller tests for cross-workspace current, stop, no-timer, start-success-in-active-workspace, start-conflict-with-other-workspace-running, and cannot-stop-other-user cases.
- [x] 2.6 Regenerate `packages/shared/openapi.json` and update `docs/API-ENDPOINTS.md` if any response shape or endpoint semantics change.

## 3. User-Web Timer State

- [x] 3.1 Extend user-web timer summary state to classify a running timer as active-workspace or cross-workspace using the active workspace scope and returned timer workspace identity.
- [x] 3.2 Ensure workspace switching invalidates or refetches the top-bar timer summary after the new token pair is applied, without first committing a false idle state.
- [x] 3.3 Ensure timer start `409 Conflict` refreshes the authoritative current timer and keeps the user's active-workspace draft available for retry after the old timer is stopped.
- [x] 3.4 Block active-workspace start and task-change actions while a cross-workspace timer is running, while keeping `Stop timer` available.
- [x] 3.5 Keep direct Time Entries row/card start actions blocked by any running timer, including cross-workspace running timers, and route users to the top-bar picker for stop-first guidance.

## 4. User-Web UI

- [x] 4.1 Render the running timer with workspace context in the desktop compact top-bar timer surface when `currentTimer.workspaceId` differs from the active workspace.
- [x] 4.2 Render the same cross-workspace running state and workspace context in the mobile timer strip below `640px`.
- [x] 4.3 Render a task-picker state that explains the timer is running in another workspace and exposes popup-owned `Stop timer` as the primary recovery action.
- [x] 4.4 After successful stop, refresh authoritative timer state and return the picker to the normal active-workspace idle Project -> Task selection flow.
- [x] 4.5 Keep normal active-workspace running behavior unchanged, including task reassignment and description updates only when the running timer belongs to the active workspace.

## 5. Frontend Tests

- [x] 5.1 Add focused composable tests for timer summary classification, workspace-switch refresh, start-conflict refresh, and cross-workspace stop-first action gating.
- [x] 5.2 Add component tests for desktop top-bar cross-workspace workspace label and mobile timer strip cross-workspace workspace label.
- [x] 5.3 Add task-picker tests for cross-workspace running state, hidden/disabled active-workspace Project -> Task controls, successful stop refresh, and no cross-workspace task-change mutation.
- [x] 5.4 Add or update Time Entries direct timer action tests so completed-entry direct starts are blocked when any workspace has a running timer.

## 6. Documentation And Verification

- [x] 6.1 Update `docs/ui/layout.md`, `docs/ui/pages-user.md`, and `docs/ui/patterns.md` with cross-workspace running timer display and stop-then-start behavior.
- [x] 6.2 Run `pnpm --filter @gitiempo/api test` if backend behavior changes.
- [x] 6.3 Run `pnpm --filter @gitiempo/shared test` and `pnpm --filter @gitiempo/shared build` if shared contracts change.
- [x] 6.4 Run `pnpm --filter user-web test` for timer and workspace-switching coverage.
- [x] 6.5 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 6.6 Run `pnpm exec openspec validate "show-running-timer-across-workspaces" --strict`.

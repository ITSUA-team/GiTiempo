## Context

Issue #288 reports that after switching workspaces, user-web can show the global timer as stopped even though the backend still rejects a new timer start because a timer is already running. The current database invariant is user-global: `time_entries_running_unique` allows at most one row with `ended_at IS NULL` per user. Current API behavior and frontend state can still appear workspace-scoped because `GET /time-entries/current` and `POST /time-entries/timer/stop` currently look up the running entry under the active token workspace.

Affected areas:

- `apps/user-web`: authenticated shell, workspace switcher, `TopBarTimer`, mobile timer strip, task-picker dialog, timer summary/actions composables, and tests.
- `apps/api`: time-entry current/stop lookup behavior and tests if current behavior is still workspace-scoped.
- `packages/shared`: time-entry response contract only if workspace display metadata is needed for cross-workspace labels.
- `docs/ui`: top-bar timer and task-picker docs if visible copy or state model changes.

## Goals / Non-Goals

**Goals:**

- Keep the authoritative running timer visible after workspace switching, including when it belongs to a different workspace than the active session workspace.
- Label cross-workspace running timers with the workspace where the timer is active.
- Prevent a misleading active-workspace `Start timer` attempt while any running timer exists for the user.
- Let users stop the old workspace timer from the current user-web session and then start a new timer in the active workspace after state refresh.
- Keep existing desktop compact top-bar and mobile timer strip ownership; do not reintroduce a dedicated Timer page or shell-level start/stop buttons outside the picker flow.

**Non-Goals:**

- No multiple concurrent timers.
- No pause/resume behavior.
- No cross-workspace task reassignment for a running entry.
- No project or task creation in a workspace different from the active session workspace.
- No admin-web timer surface changes.

## Decisions

### Treat current and stop timer as user-global operations

`GET /time-entries/current` should return the authenticated user's running timer regardless of the active workspace claim. `POST /time-entries/timer/stop` should stop the authenticated user's running timer regardless of the active workspace claim. Authorization remains safe because both operations are user-owned and target only the caller's own running entry.

Rationale: the database and product invariant are already one running timer per user. Returning `null` in another workspace creates a false idle state and lets the UI offer a start path that must fail. A user-global current/stop contract keeps UI state aligned with backend enforcement and gives the user a way to recover from the conflict.

Alternative considered: keep current/stop workspace-scoped and rely on frontend `409 Conflict` from start to rediscover the running timer. Rejected because it preserves the misleading idle state until the user takes a failing action and does not satisfy the requirement to visibly show the active timer after switching.

### Keep timer start scoped to the active workspace

Starting a timer remains scoped to the active session workspace and the selected visible task in that workspace. If any user-global running timer exists, start continues to fail with `409 Conflict`; frontend should refresh the authoritative current timer and show the cross-workspace running state instead of clearing the user's draft as if start succeeded.

Rationale: the user asked for a stop-old-then-start-new flow, not implicit moving, stopping, or replacing. Keeping start scoped preserves visibility and task authorization rules.

Alternative considered: add a combined replace-running-timer endpoint that stops the old timer and starts the new one in one request. Rejected as larger API scope with more edge cases around partial failure, duration timestamps, and user confirmation.

### Include enough workspace metadata for display

The cross-workspace UI needs a stable label such as `Running in <workspace name>`. If the current `TimeEntryResponse` cannot provide the workspace display name, extend the shared response contract with a safe workspace summary for time entries or for current timer responses. At minimum, the response already exposes `workspaceId`; implementation should avoid hardcoding workspace names from stale client state when the running entry belongs to a different workspace.

Rationale: issue #288 explicitly requires showing which workspace the timer is active in. The user needs a human-readable workspace name, not only an id.

Alternative considered: show only the project/task from the running entry. Rejected because project names can overlap across workspaces and do not explain why active-workspace task selection cannot start immediately.

### Render a cross-workspace running state in the task picker

When the running timer belongs to another workspace, the top-bar surface/mobile strip should still show live elapsed time and project/task context, plus workspace context. Opening the task picker should show a cross-workspace running state with the old workspace label and a primary `Stop timer` action. Active-workspace Project -> Task selection and `Change task` should remain unavailable until the old timer is stopped and current timer refresh returns idle.

Rationale: changing a running entry to a task in a different workspace would violate task visibility and workspace ownership. The smallest safe flow is explicit: stop the old timer, refresh to idle in the active workspace, then start a new timer with the normal active-workspace picker.

Alternative considered: keep Project -> Task selection enabled and let `Change task` move the running entry to the active workspace. Rejected because it crosses workspace boundaries, would mutate historical workspace ownership, and is not requested.

### Refresh timer state after workspace switching and conflict responses

Workspace switching in user-web must invalidate/refetch the timer summary after the new token pair is applied. Timer start `409 Conflict` handling should also refresh current timer state and keep the authoritative running timer rendered.

Rationale: both workspace switching and failed start can reveal a stale local timer state. Refreshing the current timer query after these transitions keeps UI deterministic and recoverable.

Alternative considered: clear timer summary during workspace switch and rely on normal page load. Rejected because clearing can briefly or permanently present an idle state that enables the failing start path.

## Risks / Trade-offs

- [Risk] Returning cross-workspace running entries may expose project/task names from a workspace that is no longer active. -> Mitigation: only return the caller's own running timer, include minimal display context already needed for timer ownership, and preserve workspace-scoped list/detail endpoints for non-running history.
- [Risk] Existing frontend assumptions may treat `currentTimer.workspaceId !== activeWorkspaceId` as an invalid state. -> Mitigation: model this explicitly as a cross-workspace running state in the timer summary/view model and cover it with tests.
- [Risk] Current timer response may need shared contract and OpenAPI updates. -> Mitigation: prefer extending existing safe `TimeEntryResponse` shape with workspace display metadata if needed, and run shared/API/user-web contract tests plus OpenAPI export.
- [Risk] The user may expect one-click replacement after reading the stop-then-start guidance. -> Mitigation: keep copy explicit that GiTiempo tracks one timer at a time and the old timer must be stopped before starting a new one.

## Migration Plan

No data migration is required.

Implementation sequence:

1. Verify current API behavior for cross-workspace running entries and update backend current/stop behavior if still workspace-scoped.
2. Add or extend shared contract metadata needed for workspace labels, then export OpenAPI if the contract changes.
3. Update user-web timer summary/action state to recognize cross-workspace running timers after workspace switching and start conflicts.
4. Render the workspace label in desktop and mobile timer surfaces and in the task-picker cross-workspace running state.
5. Add focused API, contract, composable, component, and workspace-switch integration tests.
6. Roll back by reverting frontend timer UI/state changes and backend current/stop contract changes together; the database invariant remains compatible.

## Open Questions

- Should the workspace label in compact surfaces use exact copy `Running in <workspace>` or a shorter mobile copy such as `In <workspace>` after design parity review against the approved `.pen` screen?

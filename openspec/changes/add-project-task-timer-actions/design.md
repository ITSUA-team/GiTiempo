## Context

`apps/user-web` already supports direct task timer actions on Time Entries and Dashboard. The presentational control lives in `components/timer/TimerActionButton.vue`, while `useTimeEntryDirectTimerActions` owns current-timer guarding, start/stop mutations, cache invalidation, and feedback for entry-backed rows. `ProjectsTaskSection.vue` renders the same task concept in desktop rows and mobile cards but currently exposes only task editing, GitHub links, status, and updated metadata.

Starting requires a visible task id. Current-timer state identifies the authoritative running entry and task. Stopping is identity-bound for current clients: they send the expected running entry id, and the API conditionally stops only that active entry for the authenticated member. A changed or already stopped entry returns `409 Conflict`. To support already-installed browser-extension builds, the same endpoint temporarily accepts a bodyless legacy request with its previous user-global stop behavior. The frontend must continue to respect the cross-workspace single-running-timer invariant and the top-bar timer as the recovery surface.

The change follows `apps/user-web/AGENTS.md`, `docs/ui/INDEX.md`, and `docs/ui/pages-user.md`. The checked-in `GITiempo.pen` contains the approved GiTiempo Projects and Time Entries screens. The Projects screen now carries the timer-state reference below; no unrelated canvas content was replaced.

## Goals / Non-Goals

**Goals:**

- Let a member start a fresh timer directly from any visible active task on Projects.
- Let the row/card for the currently tracked task stop the authoritative running timer.
- Preserve the single-running-timer invariant, including timers running in another workspace.
- Keep task-specific labels, loading treatment, and success/error feedback consistent with Time Entries.
- Preserve desktop table and mobile card parity.

**Non-Goals:**

- Adding new endpoints, persistence, authorization rules, or dependencies.
- Adding descriptions, manual entry, pause/resume, or task reassignment to the Projects row action.
- Moving the global task picker or cross-workspace stop-first explanation into Projects page content.
- Extracting product-specific Projects row markup into `packages/web-shared`.

## Decisions

### Render one action state from authoritative current-timer data

Each visible task derives its action from the current-timer query:

- no running timer: `Start timer`;
- current timer belongs to this task in the active workspace: `Stop timer`;
- another task or workspace owns the current timer: a visually disabled start affordance that remains activatable only to open the existing top-bar stop-first guidance;
- current-timer state is still loading or any timer mutation is pending: native-disabled to prevent duplicate requests.

Closed tasks do not render a direct timer action because the task service rejects closed tasks as untrackable. During any start/stop operation or timer-state reconciliation, every direct timer action is native-disabled; only the initiating task displays a loading state. A matching active stop remains available when no operation is pending.

This mirrors the behavior members already see on Time Entries while adapting identity from time-entry id to task id. Showing `Stop timer` only on the matching task is preferable to showing disabled play controls everywhere because it gives the user a local recovery action when the active task is visible.

### Keep Projects timer orchestration page-specific

Add a focused Projects timer composable that uses the existing current-timer query plus start/stop mutations and `timerKeys` invalidation. Starting submits the selected task id. Stopping first refetches current-timer state and proceeds only when the authoritative timer still has both the selected task and the expected entry id. It then submits that entry id to the conditional stop mutation; otherwise it reconciles the UI and reports that the timer changed.

Successful start and stop mutations rely on their shared mutation invalidation to refresh active timer consumers exactly once. A failed direct mutation performs one explicit current-timer refetch with error propagation so the Projects action can surface a retryable refresh error without issuing a duplicate invalidation or cancelling its own request.

The alternative is to broaden `useTimeEntryDirectTimerActions` around a union of entry-backed and task-backed targets. That would mix two different refresh and identity rules: Time Entries verifies an exact running entry and reloads entry lists, while Projects verifies a task and does not need to reload project/task data. Separate orchestration keeps those lifecycles explicit.

### Extract only the stable presentational timer-action leaf

Move or generalize the current Time Entries button into a user-web timer component that accepts an explicit action, `target: { id, title }` for its task label and target/test identity, disabled/guidance state, and pending state. Stop-first guidance is an explicit behavior prop; test identifiers remain observational. Time Entries, Dashboard, and Projects keep their own event handling and domain data mapping.

This satisfies the frontend reuse rule without moving an app-local control to `packages/web-shared` or forcing Projects-specific behavior into a generic package. The button continues to use PrimeVue, Heroicons, existing design tokens, task-specific tooltip copy, and accessible labels.

### Reconcile mutations through the shared timer cache

On successful start or stop, invalidate the user-scoped timer query so the top-bar timer and every direct-action surface converge on the same state. Show the existing success-toast pattern. On request failure, show the repository-standard API error message and refresh authoritative timer state.

If a start returns `409 Conflict`, do not clear filters or task state. Refresh current-timer data and open the existing top-bar task/timer dialog so the member receives the established stop-first guidance. This avoids duplicating cross-workspace copy or state logic in Projects.

### Preserve row/card hierarchy and design parity

On desktop, place the action immediately before the task-title/link group in the first task cell, matching the Time Entries first-column pattern. On mobile, place the action beside the task-title block while preserving status and updated metadata below. Both branches expose identical start/stop behavior and task-specific accessible names.

The approved GiTiempo `.pen` source now includes the Projects desktop and mobile action states. No PrimeVue deviation is assumed; any actual constraint must be documented during implementation review.

### Design parity checklist

- Desktop action is a 48 × 32 px, 6 px-radius icon button immediately before the task title/GitHub-link group in the first task cell.
- Mobile uses the same control and state mapping beside the task-title block; status and updated metadata remain beneath it.
- Start uses the purple play control, matching-task stop uses the purple square control, blocked start uses an outlined muted play control, and pending uses the purple loader state.
- Every state keeps a task-specific accessible name and tooltip; blocked starts use the existing top-bar stop-first wording.
- Existing title edit affordance, GitHub link, status, updated metadata, project heading, and Add task action remain aligned and available at both breakpoints.

## Planned Changes by App

### `apps/user-web`

- Generalize the existing timer-action button into a task-oriented presentational leaf and update Time Entries/Dashboard call sites without behavior changes.
- Add Projects-specific direct timer orchestration using existing query/mutation helpers.
- Wire timer state and intents through `ProjectView.vue` into `ProjectsTaskSection.vue`.
- Add component, composable, and view-level coverage for desktop/mobile rendering, start/stop transitions, blocked starts, stale state, and request failures.
- Update `docs/ui/pages-user.md` after the approved design state is available.

### Design source

- Update the approved GiTiempo Projects desktop and mobile timer states without replacing unrelated canvas content.
- Add idle, running-same-task, and blocked-by-other-timer Projects states for desktop and mobile, then verify parity before code completion.

The conditional stop contract changes `apps/api` and `packages/shared`. No change is planned for `packages/web-config` or `packages/web-shared`.

## Risks / Trade-offs

- **Design parity can drift between table and cards** → Use the approved desktop and mobile timer-state screens as a checklist before code completion.
- **Timer state can change in another tab or workspace between render and click** → Refetch before stop, conditionally stop by expected entry id, handle `409 Conflict`, and invalidate the shared timer cache after every outcome.
- **Generalizing the existing button could regress Time Entries or Dashboard** → Keep the presentational contract small and run their existing direct-action component tests alongside new Projects tests.
- **A running task may be hidden by Projects filters** → The global top-bar timer remains visible and owns the guaranteed stop/recovery path; filters are not reset implicitly.
- **Multiple row controls can appear startable during mutation latency** → Disable all starts while a start mutation or current-timer refresh is pending, with a spinner only on the task that initiated the action.

## Migration Plan

No data migration is required. Ship the API, shared-contract, user-web, Chrome extension, docs, and design changes together after tests pass. The stop endpoint remains backward-compatible with bodyless requests while installed extension builds roll forward; current clients always send `expectedTimerId` and retain the conditional-stop guarantee. Rollback consists of reverting that compatible set of changes.

## Open Questions

None.

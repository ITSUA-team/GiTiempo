## Context

The user-web Timer route is already registered under the authenticated shell, but `TimerView.vue` currently renders a placeholder. The current frontend docs and approved `GITiempo.pen` Timer Page agree on an MVP scope: visible workspace `Project -> Task` selection, a centered running timer, one large state-dependent CTA, and a manual interval panel below the timer actions.

The backend already provides the needed local APIs through existing contracts: list visible projects, list tasks for a visible project, get current timer, start timer for a task, stop current timer, and create a manual time entry. This change should stay frontend-focused and reuse those endpoints without changing API shapes.

Affected app/package guidance:
- `apps/user-web/AGENTS.md`: route pages stay app-local, follow `docs/ui/INDEX.md`, use PrimeVue controls, and treat docs as source of truth when design conflicts.
- `docs/ui/pages-user.md`: Timer Page scope is visible workspace `Project -> Task` selection only.
- `docs/ui/patterns.md`: selector, date/time picker, and duration-format patterns define component behavior.

## Goals / Non-Goals

**Goals:**

- Implement the user-web Timer Page using the current approved `.pen` layout and current UI docs.
- Fetch and render visible local projects and tasks for authenticated users.
- Fetch current running timer state and show elapsed `HH:MM:SS` based on `startedAt`.
- Provide a singular large CTA that reads `Start` when idle, reads `Stop` when running, starts a selected task when idle, and stops the current timer when running.
- Provide a manual interval panel for creating completed entries with selected task, date, start time, and end time.
- Keep API clients and page composition app-local unless reuse becomes proven by another SPA.

**Non-Goals:**

- No GitHub organization/repository/issue selector.
- No external-provider connection, sync, or fallback behavior.
- No freeform task creation from the timer page.
- No pause/resume timer behavior.
- No backend API, database, or shared contract changes.
- No dashboard or time-entry-list implementation work beyond effects caused by existing backend data.

## Decisions

1. Use existing local APIs instead of adding backend endpoints.

   Rationale: The current docs and `apps/user-web/AGENTS.md` explicitly scope the timer page to visible workspace `Project -> Task` selection. Existing project, task, and time-entry endpoints satisfy that scope.

   Alternative considered: Implement GitHub selector APIs first. Rejected because the current docs and design no longer require external-provider selection for the Timer Page MVP.

2. Keep timer page HTTP helpers in `apps/user-web`.

   Rationale: The page is app-local, and there is not yet a second frontend consumer for these exact helper leaves. This follows `packages/web-shared/AGENTS.md` guidance to extract only proven-identical reusable leaves.

   Alternative considered: Add timer clients to `packages/web-shared`. Rejected until `admin-web` or another surface needs the same browser runtime behavior.

3. Derive elapsed time client-side from server `startedAt`.

   Rationale: Running timer responses intentionally have `endedAt: null` and `durationSeconds: null`. The UI can compute the visible elapsed value from the current clock and refresh it once per second while a timer is running.

   Alternative considered: Poll the backend every second. Rejected because it is unnecessary load and the backend already provides the authoritative start timestamp.

4. Use one CTA with state-dependent behavior.

   Rationale: The updated docs specify a singular large CTA with state-dependent text. When no timer is running, the CTA reads `Start` and starts the selected task. When a timer is running, the CTA reads `Stop` and stops the running entry regardless of selector state.

   Alternative considered: Separate Start and Stop buttons. Rejected because it conflicts with the finalized design.

5. Use PrimeVue controls with token-backed Tailwind utility classes.

   Rationale: UI docs require PrimeVue for standard controls and token utilities for styling. The page should match the `.pen` desktop layout while remaining responsive on mobile.

## Risks / Trade-offs

- API errors can leave stale local UI state → Refetch current timer after successful start/stop/manual-entry actions and show toast errors for failed actions.
- Client clock drift can affect displayed elapsed time → Treat the server `startedAt` as authoritative and recompute from it; the stored backend duration remains authoritative after stop.
- Manual interval date/time composition can produce invalid ranges → Validate in the page before submit and rely on shared API validation as the final boundary.
- Project/task lists may be empty for some users → Render disabled downstream controls and clear empty-state guidance rather than exposing an enabled CTA.
- A running timer may belong to a task different from the current selector → Render the running timer summary from `current.timeEntry` and make the CTA stop that running timer.

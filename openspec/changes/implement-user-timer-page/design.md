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

6. Keep page orchestration separate from transport duplication and presentational empty states.

   Rationale: Timer-page behavior combines async project/task loading, running-timer state, derived CTA mode, and manual-entry validation. To keep support cost down, the implementation must avoid duplicating fetch-boundary helpers that already exist elsewhere, must distinguish request failures from true empty data states, and should keep route-level UI composition separate from stateful orchestration when the page grows beyond a single responsibility.

7. Keep reactive time state and composable ownership explicit.

   Rationale: The running timer display depends on a ticking reactive source, so the rendered elapsed value must derive from the reactive state that actually changes every second. Likewise, the page should not introduce a second state representation by wrapping composable returns in `reactive(...)` only for template convenience, because that splits how maintainers and tests reason about the same feature state.

8. Keep extracted transport helpers in a neutral shared namespace.

   Rationale: If timer-page work extracts fetch-boundary logic out of existing clients, the resulting helper is not auth-specific and should live under a neutral shared browser/runtime path. This avoids misleading package ownership and prevents future non-auth consumers from accumulating under an unrelated namespace.

9. Lock project and task selection while a timer is running.

   Rationale: Once the current timer is active, the page summary and stop action are driven by `current.timeEntry`, not by a newly chosen selector value. Allowing users or future code paths to mutate project/task selection while the timer is running creates UI drift and makes support/debugging harder because the selectors no longer represent an actionable start state.

   Alternative considered: Leave selectors enabled and ignore them while the timer is running. Rejected because it permits misleading state changes and relies on maintainers remembering that the selectors are visually editable but behaviorally inert.

10. Treat extracted transport helpers as a full consolidation point, not an extra variant.

   Rationale: The timer page may justify extracting shared fetch-boundary logic, but the extraction only reduces support cost if it replaces nearby duplicates and carries direct boundary tests. Adding a new helper while leaving old variants intact increases drift risk instead of reducing it.

11. Show toast feedback for every timer-page API outcome.

   Rationale: Timer-page actions are stateful and user-facing. If project/task/current-timer requests fail silently, or start/stop/manual-entry mutations complete without explicit feedback, users and support engineers cannot distinguish loading delay from rejected state. Inline empty/error panels help with page context, but toast feedback is still needed as the immediate action/result channel.

   Alternative considered: Reserve toasts only for writes. Rejected because failed read requests on this page directly affect whether the selectors and running timer state can be trusted.

12. Resync project and task selectors from the current active timer.

   Rationale: When the backend returns a running timer, that response becomes the authoritative feature state. If selectors keep an older local project/task choice, the page shows conflicting contexts between the selectors and the running summary. Syncing selectors to the active entry removes that drift and makes the locked state understandable.

   Alternative considered: Keep prior selector values and only change the summary card. Rejected because it preserves contradictory UI state on the same screen.

13. Preserve manual-entry inputs on active-timer conflict failures.

   Rationale: A manual-entry submission can be rejected because it overlaps or is otherwise interrupted by the current active timer entry. In that case the user needs the exact API error, the active timer context kept visible, and the entered values preserved so they can correct the interval instead of retyping it.

   Alternative considered: Reset the form after any submit attempt and rely on generic error text. Rejected because it hides the real conflict source and discards the user's corrective context.

14. Treat conflict errors as a signal to refresh current timer state.

   Rationale: A conflict can mean the local page is stale because another tab/device already started or changed a timer. Showing only the rejection leaves the page in the stale local state that caused the failed action. Refreshing current timer state after timer-start and manual-entry conflicts restores the backend as the source of truth and lets selector resync rules run.

   Alternative considered: Keep local state unchanged and rely on the user to refresh manually. Rejected because it preserves misleading idle/running state after the backend has already told the page its state is stale.

15. Keep timer-page action errors scoped to their owning UI region.

   Rationale: Start/stop failures belong near the timer CTA. Manual-entry failures belong in the manual interval panel. Copying one failure into both regions makes the page look like two actions failed, increases support ambiguity, and creates unnecessary coupling between unrelated UI sections.

   Alternative considered: Maintain one broad page-level action error for all failures. Rejected because the page has multiple independent action surfaces with different recovery paths.

16. Keep shared transport helpers narrow and intentionally exported.

   Rationale: The timer page can justify a neutral shared fetch helper to consolidate existing auth/current-user transport behavior, but root-exporting a generic request primitive makes it easy for future pages to bypass app-local domain clients. Low-level helpers should stay internal or use an explicit subpath with a deliberate public contract.

   Alternative considered: Export the helper from the root shared package for convenience. Rejected because convenience exports tend to become accidental architecture and increase feature-to-transport coupling.

17. Do not complete the timer page with new Vue lint warning debt.

   Rationale: The timer page is a new implementation surface, so class ordering, attribute ordering, and formatting warnings are avoidable at introduction time. Leaving warning-heavy new markup normalizes noisy diffs and makes future UI reviews more expensive.

   Alternative considered: Accept warnings because lint exits successfully. Rejected because the warnings are concentrated in newly authored code and are mostly mechanical to fix before merge.

## Risks / Trade-offs

- API errors can leave stale local UI state → Refetch current timer after successful start/stop/manual-entry actions and show toast errors for failed actions.
- Missing per-request feedback can make timer actions look ignored or stuck → Show toast feedback for failed reads and for both success/failure of start, stop, and manual-entry mutations.
- Conflict errors can indicate the page is stale relative to another tab/device → Refresh current timer state after start/manual-entry conflicts before keeping the page idle.
- Client clock drift can affect displayed elapsed time → Treat the server `startedAt` as authoritative and recompute from it; the stored backend duration remains authoritative after stop.
- Manual interval date/time composition can produce invalid ranges → Validate in the page before submit and rely on shared API validation as the final boundary.
- Project/task lists may be empty for some users → Render disabled downstream controls and clear empty-state guidance rather than exposing an enabled CTA.
- A running timer may belong to a task different from the current selector → Render the running timer summary from `current.timeEntry` and make the CTA stop that running timer.
- Selector values can drift from the active entry after load or mutation refresh → Resync selected project/task from the authoritative current timer response whenever a running entry exists.
- UI fetch failures can be mistaken for empty data if state is collapsed too early → Keep request-error state separate from empty collections and render the error state with priority over empty messaging.
- Transport helpers can drift if timer-specific fetch logic is cloned from existing auth/current-user clients → Reuse or extract shared fetch-boundary helpers before adding another variant.
- Timer UI can appear frozen if the elapsed display bypasses the reactive source updated by the interval → Make the rendered `HH:MM:SS` value depend directly on the ticking reactive state.
- Feature state becomes harder to reason about if composable refs are re-wrapped into a second proxy shape at the page level → Keep one explicit state representation between composable, component, and tests.
- Running timer selectors can drift away from the active entry if project/task remains editable during a running timer → Disable selector controls and reject project/task mutation in feature logic while the timer is active.
- Manual-entry conflict failures can erase the user's corrective context → Preserve entered date/time values on conflict errors, render the active timer as authoritative, and show the exact API message in a toast.
- Duplicated inline errors can imply multiple failed actions for one API rejection → Keep manual-entry errors scoped to the manual interval panel and start/stop errors scoped to the timer CTA region.
- Extracted fetch-boundary helpers can become a fourth local variant instead of a consolidation point → When introducing a shared helper, migrate sibling clients or keep the helper local until shared adoption is part of the same change, and cover the helper/client boundary with direct tests.
- Root-exported transport helpers can become accidental architecture for future pages → Keep low-level request helpers internal or expose them only through an explicit narrow subpath, not the root shared package barrel.
- Newly authored Vue markup can introduce avoidable warning debt → Fix auto-fixable Tailwind class-order, Vue attribute-order, and formatting warnings before marking timer-page implementation complete.

## Context

The user-web top-bar timer owns the global start/stop workflow, while Dashboard weekly aggregate surfaces, Dashboard recent entries, and the Time Entries page each keep their own fetched list state. When the top-bar timer starts or stops an entry, those consumers can keep rendering stale running-entry data or stale derived weekly aggregates until their page state is refreshed.

The source of truth for this change is the existing user-pages spec, `docs/ui/pages-user.md`, and the approved `GITiempo.pen` User Dashboard and Time Entries frames. The visual design already includes the top-bar timer, highlighted running/current rows, and completed-entry rows/cards; this change updates state coordination, not layout. The nearest app guidance is `apps/user-web/AGENTS.md`.

Existing contracts already return the authoritative time entry from `POST /time-entries/timer/start` and `POST /time-entries/timer/stop`. No backend endpoint, OpenAPI, or shared contract shape change is required.

## Goals

- Synchronize Dashboard weekly aggregates and recent entries with successful top-bar timer starts and stops.
- Synchronize the Time Entries list with successful top-bar timer starts and stops when the affected entry belongs to the current visible list scope or is already visible.
- Clear running-entry visuals, live duration ticking, and running-entry edit/delete restrictions immediately after a top-bar stop succeeds.
- Keep Dashboard weekly focus/stat values aligned with the authoritative weekly entry set after top-bar timer changes.
- Keep idle top-bar task selection from creating synthetic rows or current-entry highlighting.
- Preserve backend list semantics for ordering, filtering, and pagination.

## Non-Goals

- Redesigning Dashboard, Time Entries, or the top-bar timer.
- Adding page-local timer start/stop controls.
- Changing timer endpoints, list endpoints, shared schemas, OpenAPI, auth, or role behavior.
- Introducing cross-tab or multi-device realtime synchronization.
- Reordering completed entries with a frontend-only rule that differs from backend ordering.

## Decisions

### App-local timer list synchronization

Add an app-local synchronization path inside `apps/user-web` so `useTopBarTimer` can publish successful timer lifecycle changes and dashboard/list-owning composables can reconcile their state. Keep this in user-web because the behavior is specific to the user app shell and its Dashboard/Time Entries surfaces.

The top-bar timer should publish only authoritative outcomes:

- successful timer start with the returned running time entry
- successful timer stop with the returned completed time entry

Failed timer mutations must not update list state.

### Reconcile from returned time-entry payloads

Consumers should treat the returned `TimeEntryResponse` as authoritative. Reconciliation rules must stay deterministic across filtered and paginated Time Entries scopes:

- When the returned entry matches an existing visible row or card, replace that entry by `id` before applying any running/completed derived UI state.
- When no visible row or card with that `id` exists, insert the returned entry only if it matches the active visible filters and the cached scope is unpaged or on page 1.
- When the returned entry no longer matches the active visible filters, remove any currently visible row or card with that `id`.
- When a paginated visible list gains or loses the returned entry through local reconciliation, update that cached response's pagination metadata so `total` and `totalPages` stay aligned with the visible list state.
- Do not inject newly visible entries into later paginated pages.
- When a scope's active filters, grouping, or pagination semantics cannot be preserved safely through local reconciliation, leave that scope unchanged until it is reloaded through the existing list request.

Dashboard weekly aggregate queries and recent entries may reconcile locally when the returned entry belongs in their visible query scope. Dashboard recent entries must continue to cap the visible recent list to the documented recent-entry limit. Dashboard weekly focus/stats must continue deriving from the current-week query result instead of duplicating a second aggregate store. Time Entries must preserve the user's active filters, grouping, and pagination.

### Running-state cleanup after stop

After a stop event replaces a visible running entry, derived row/card state must be based on the completed payload:

- `endedAt` and `durationSeconds` drive completed time range and duration display.
- running/current visual state is removed for that entry.
- live duration ticking no longer changes that row/card.
- weekly focus/stat values recalculate from the reconciled current-week entry set.
- Time Entries edit/delete affordances return for the completed entry according to existing page rules.

### Idle selection is not a list state

Changing the top-bar selected task while no timer is running updates only top-bar context. It must not insert a row, mark a list item current, or show a running/current highlight in Dashboard or Time Entries.

### Tests before implementation complete

Implementation should add focused coverage around the app-local synchronization path and the three affected consumers: Dashboard weekly aggregates, Dashboard recent entries, and the Time Entries list. The highest-risk regression is stale running state after top-bar stop, so that behavior should be covered first, including the derived weekly aggregate values.

## Risks/Trade-offs

- Local reconciliation is faster than refetching every list after every timer action, but it needs careful visible-scope checks to avoid showing entries outside active filters or pages.
- Refetching ambiguous Time Entries scopes is simpler and preserves backend semantics, but introduces an extra request after timer mutations.
- Dashboard weekly aggregates, Dashboard recent entries, and Time Entries use separate query shapes today, so shared synchronization should stay small and event-shaped rather than becoming a broad shared data store.

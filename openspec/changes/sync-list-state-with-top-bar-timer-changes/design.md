## Context

The user-web top-bar timer owns the global start/stop workflow, while Dashboard recent entries and the Time Entries page each keep their own fetched list state. When the top-bar timer stops an entry, those lists can keep rendering the stale running entry until their page state is refreshed.

The source of truth for this change is the existing user-pages spec, `docs/ui/pages-user.md`, and the approved `GITiempo.pen` User Dashboard and Time Entries frames. The visual design already includes the top-bar timer, highlighted running/current rows, and completed-entry rows/cards; this change updates state coordination, not layout. The nearest app guidance is `apps/user-web/AGENTS.md`.

Existing contracts already return the authoritative time entry from `POST /time-entries/timer/start` and `POST /time-entries/timer/stop`. No backend endpoint, OpenAPI, or shared contract shape change is required.

## Goals

- Synchronize Dashboard recent entries with successful top-bar timer starts and stops.
- Synchronize the Time Entries list with successful top-bar timer starts and stops when the affected entry belongs to the current visible list scope or is already visible.
- Clear running-entry visuals, live duration ticking, and running-entry edit/delete restrictions immediately after a top-bar stop succeeds.
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

Add an app-local synchronization path inside `apps/user-web` so `useTopBarTimer` can publish successful timer lifecycle changes and list-owning composables can reconcile their state. Keep this in user-web because the behavior is specific to the user app shell and its Dashboard/Time Entries surfaces.

The top-bar timer should publish only authoritative outcomes:

- current timer summary refresh
- successful timer start with the returned running time entry
- successful timer stop with the returned completed time entry

Failed timer mutations must not update list state.

### Reconcile from returned time-entry payloads

Consumers should treat the returned `TimeEntryResponse` as authoritative. When the returned entry matches an existing visible row/card, replace that entry by `id`. When a started entry belongs in a visible scope, insert it using the same ordering semantics as the backend list. When the visible scope cannot confidently include the returned entry because filters or pagination exclude it, leave the list unchanged or reload that scope through the existing list request.

Dashboard recent entries may reconcile the latest-entry scope locally and cap the visible recent list to the documented recent-entry limit. Time Entries must preserve the user's active filters, grouping, and pagination.

### Running-state cleanup after stop

After a stop event replaces a visible running entry, derived row/card state must be based on the completed payload:

- `endedAt` and `durationSeconds` drive completed time range and duration display.
- running/current visual state is removed for that entry.
- live duration ticking no longer changes that row/card.
- Time Entries edit/delete affordances return for the completed entry according to existing page rules.

### Idle selection is not a list state

Changing the top-bar selected task while no timer is running updates only top-bar context. It must not insert a row, mark a list item current, or show a running/current highlight in Dashboard or Time Entries.

### Tests before implementation complete

Implementation should add focused coverage around the app-local synchronization path and the two list consumers. The highest-risk regression is stale running state after top-bar stop, so that behavior should be covered first.

## Risks/Trade-offs

- Local reconciliation is faster than refetching every list after every timer action, but it needs careful visible-scope checks to avoid showing entries outside active filters or pages.
- Refetching ambiguous Time Entries scopes is simpler and preserves backend semantics, but introduces an extra request after timer mutations.
- Dashboard and Time Entries have separate list models today, so shared synchronization should stay small and event-shaped rather than becoming a broad shared data store.

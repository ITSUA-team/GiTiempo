## Why

The top-bar timer can start or stop a timer while the Dashboard weekly insight/stat surfaces, Dashboard recent entries, and Time Entries page keep their own fetched list state. This allows running-entry UI and derived weekly aggregates to stay stale after the timer changes until the user refreshes or reloads the affected surface.

## What Changes

- Synchronize user-web time-entry list and dashboard aggregate state with authoritative top-bar timer lifecycle changes.
- When the top-bar timer starts a timer, update relevant Dashboard weekly aggregates, Dashboard recent-entry state, and Time Entries list state with the returned running entry when it belongs in the currently visible query scope.
- When the top-bar timer stops a timer, replace any matching running entry in relevant dashboard/list state with the returned completed entry so running highlight, live duration, weekly insight/stat values, and running-entry edit/delete restrictions clear immediately.
- Keep idle top-bar task selection from creating synthetic list rows or current-entry highlighting.
- Preserve backend list ordering semantics; frontend reconciliation must not introduce a separate completed-time sort rule.
- Preserve existing backend timer and time-entry contracts; no endpoint or shared contract shape change is planned.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Define cross-surface synchronization between the global top-bar timer and user-facing time-entry list surfaces.
  This includes Dashboard weekly focus/stats, Dashboard recent entries, and the Time Entries page.

## Impact

- Affected frontend app: `apps/user-web` timer, dashboard overview, Time Entries page composables/components, and tests.
- Affected specs: `openspec/specs/user-pages/spec.md` via a change-local delta.
- Affected UI source: `docs/ui/pages-user.md` and approved `GITiempo.pen` User Dashboard and Time Entries frames remain the visual source of truth.
- Affected APIs/contracts: existing `GET /time-entries`, `GET /time-entries/current`, `POST /time-entries/timer/start`, and `POST /time-entries/timer/stop` behavior is reused; no backend implementation change is planned.

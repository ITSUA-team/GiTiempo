## Why

The top-bar timer can start or stop a timer while the Dashboard recent entries and Time Entries page keep their own fetched list state. This allows running-entry UI to stay visually active after the timer is stopped until the user refreshes or reloads the list.

## What Changes

- Synchronize user-web time-entry list state with authoritative top-bar timer lifecycle changes.
- When the top-bar timer starts a timer, update relevant Dashboard recent-entry and Time Entries list state with the returned running entry when it belongs in the currently visible list scope.
- When the top-bar timer stops a timer, replace any matching running entry in relevant lists with the returned completed entry so running highlight, live duration, and running-entry edit/delete restrictions clear immediately.
- Keep idle top-bar task selection from creating synthetic list rows or current-entry highlighting.
- Preserve backend list ordering semantics; frontend reconciliation must not introduce a separate completed-time sort rule.
- Preserve existing backend timer and time-entry contracts; no endpoint or shared contract shape change is planned.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Define cross-surface synchronization between the global top-bar timer and user-facing time-entry list surfaces.

## Impact

- Affected frontend app: `apps/user-web` timer, dashboard overview, Time Entries page composables/components, and tests.
- Affected specs: `openspec/specs/user-pages/spec.md` via a change-local delta.
- Affected UI source: `docs/ui/pages-user.md` and approved `GITiempo.pen` User Dashboard and Time Entries frames remain the visual source of truth.
- Affected APIs/contracts: existing `GET /time-entries`, `GET /time-entries/current`, `POST /time-entries/timer/start`, and `POST /time-entries/timer/stop` behavior is reused; no backend implementation change is planned.

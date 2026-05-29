## 1. Implementation

- [x] 1.1 Add an app-local user-web synchronization path for successful top-bar timer start/stop outcomes.
- [x] 1.2 Publish authoritative start/stop results from `useTopBarTimer` without publishing failed mutations or idle task selection as list state.
- [x] 1.3 Reconcile Dashboard weekly aggregates when a top-bar timer start/stop affects the current-week query scope, preserving existing weekly derivation semantics.
- [x] 1.4 Reconcile Dashboard recent entries when a top-bar timer start/stop affects the recent-entry scope, preserving backend ordering semantics and recent-list limits.
- [x] 1.5 Reconcile Time Entries list state when a top-bar timer start/stop affects the current visible list scope or an already visible entry, preserving active filters, grouping, and pagination.
- [x] 1.6 Keep filtered and paginated Time Entries reconciliation deterministic: replace visible entries by `id`, insert only into matching unpaged or page-one scopes, remove visible entries that stop matching filters, and update paginated metadata without injecting new rows into later pages.
- [x] 1.7 Ensure stopped entries immediately clear running highlights, live duration growth, stale weekly aggregate contribution, and running-entry edit/delete restrictions in Dashboard and Time Entries.

## 2. Verification

- [x] 2.1 Add focused tests for top-bar timer start/stop synchronization with Dashboard weekly aggregates and recent entries.
- [x] 2.2 Add focused tests for top-bar timer start/stop synchronization with the Time Entries page, including filtered/page-one insertion, later-page non-insertion, and paginated metadata updates.
- [x] 2.3 Add focused coverage that idle top-bar task selection does not create or highlight list entries.
- [x] 2.4 Run the relevant user-web test/typecheck checks for the touched frontend surface.

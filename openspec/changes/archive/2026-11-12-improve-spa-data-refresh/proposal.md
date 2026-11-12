# Proposal

## Why

Routine data refreshes in GiTiempo can replace populated pages with loading skeletons, while broad invalidation and overlapping refresh owners cause avoidable requests. Users experience ordinary navigation and mutations as repeated page reloads despite the existing SPA architecture.

## What Changes

- Preserve populated Time Entries and Projects content during same-scope background refreshes, including local filters, focus, expansion, and scroll where the updated records remain valid. Keep initial loading, refreshing, empty, and failure states distinct.
- Give Projects one refresh owner so retry, focus revalidation, and mutation reconciliation do not schedule duplicate task-list requests or reload every unrelated project's tasks.
- Reconcile task and time-entry/timer mutations against affected resources, preserving authoritative timer state, project summaries, own-time visibility, and access-scope changes.
- Introduce explicit, bounded cache policies for the selected user lists and admin Reports resources; retain report rows across short route round trips instead of discarding them on unmount. Keep critical timer/access revalidation and session cache cleanup intact.
- Update saved-report presets from authoritative mutation responses instead of fetching the entire preset list after every successful write.
- Add request-budget, stale-response, cache-isolation, and rendered-content continuity tests plus real-page acceptance checks.
- Preserve all existing success, info, and error notification behavior. Notification-policy changes are explicitly out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-server-state-composables`: Specify content-preserving refresh transitions, bounded feature-specific cache reuse, single-owner request coordination, precise mutation reconciliation, and measurable cross-app acceptance criteria.

## Impact

- Layer: frontend, with shared frontend helpers only if an identical reusable leaf is needed. Primary surfaces are `apps/user-web` Time Entries, Projects, and their timer/query dependencies; `apps/admin-web` Reports and saved-report presets.
- Update related UI loading/cache documentation and focused tests. Preserve approved page structure, controls, accessibility, and first-load skeleton shapes.
- No backend endpoints, shared API payloads, authentication protocol, database schema, or new dependencies are required. Existing session, workspace, permission, and own-time boundaries remain mandatory.
- Do not expand into invoice rounding, password recovery, a general HTTP client rewrite, persistent browser caching, live subscriptions, or a notification-policy change. Existing admin invoice behavior remains outside this implementation slice.
- Tracking issue: [#496 — Improve SPA data refresh and reduce redundant requests](https://github.com/ITSUA-team/GiTiempo/issues/496), milestone `M8 Quality, Security, And Production Readiness`.

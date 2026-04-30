## Why

The frontend currently relies on duplicated hardcoded localhost ports for cross-workspace links while the repo does not define those ports in one canonical place. This makes local workspace switching brittle, leaves env examples inconsistent across the two SPAs, and spreads the same local URL assumptions across runtime code and tests.

## What Changes

- Replace duplicated inline localhost port assumptions in `user-web`, `admin-web`, and `packages/web-shared` with an explicit frontend configuration approach for counterpart SPA URLs.
- Align the user and admin SPA env examples so each app documents the counterpart workspace URL it expects in local development.
- Centralize or remove runtime fallback behavior so cross-workspace links no longer depend on repeated hardcoded port literals in multiple views and layout components.
- Update frontend tests and frontend-only tooling config to follow the same source of truth for counterpart workspace URLs.
- Exclude backend env validation, backend runtime configuration, invite delivery, and API URL handling from this change.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `admin-routing`: tighten cross-SPA switching behavior so visible workspace links resolve through explicit frontend configuration instead of duplicated inline localhost assumptions.

## Impact

- Affected code: `apps/user-web`, `apps/admin-web`, and `packages/web-shared`.
- Affected systems: frontend runtime URL resolution, frontend env examples, and frontend tests for workspace switching links.
- No backend API, env validation, or contract changes are included in this proposal.

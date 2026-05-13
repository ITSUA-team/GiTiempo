## Why

The UI docs and approved `GITiempo.pen` screens now require icon-only authenticated navigation and icon-only table row actions, but the active OpenSpec requirements still preserve a text-only navigation contract. This blocks safe implementation because code changes would otherwise satisfy design parity while violating planning source of truth.

## What Changes

- Align the shared authenticated navigation requirements with icon-only sidebar and mobile navigation across `user-web` and `admin-web`.
- Require former navigation/action text to remain available as tooltip copy and accessible labels when visible labels are removed.
- Align table row action requirements with icon-only buttons across user and admin management tables.
- Keep route ownership, route names, and active-state decisions app-local while allowing each app to provide icon metadata to shared navigation rendering.
- Preserve documented action hierarchy and destructive/non-destructive color semantics for action icons.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-shared-leaves`: Change shared authenticated navigation from a text-only visual base to an icon-only visual contract with app-local icon metadata and accessible labels.
- `components`: Add/clarify shared row-action component behavior for icon-only table actions, tooltip copy, accessible labels, and token-based icon styling.

## Impact

- Affected frontend package: `packages/web-shared` shared navigation and management-table action styling/components.
- Affected apps: `apps/user-web` and `apps/admin-web` shell nav item definitions and row action rendering.
- Design parity target: `GITiempo.pen` screens including Time Entries, Projects List, Admin Members, and Admin Projects.
- No backend endpoints, shared API contracts, database schema, or OpenAPI changes are expected.

## MODIFIED Requirements

### Requirement: Shared Authenticated Header Chrome Is Extractable

The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local. The shared header SHALL allow app-specific identity text visibility and center-content alignment choices without owning app-specific timer or auth orchestration.

#### Scenario: Shared header owns workspace-switching menu section without owning auth orchestration

- **WHEN** `user-web` and `admin-web` render the shared authenticated header for a user with more than one available workspace membership
- **THEN** the shared header renders the workspace-switching section before the counterpart workspace action
- **AND** the shared header identifies the current workspace and exposes switch intents only for alternate memberships
- **AND** the shared header remains prop/event-driven rather than importing app auth stores, route names, token replacement logic, or redirect policy
- **AND** the consuming app shells continue to own token replacement, route fallback, counterpart workspace URLs, and logout handlers

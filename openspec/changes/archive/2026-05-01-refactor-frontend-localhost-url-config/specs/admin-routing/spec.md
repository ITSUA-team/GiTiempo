## MODIFIED Requirements

### Requirement: Cross-SPA Switching Entry Points

The web products MUST provide visible entry points between `user-web` and `admin-web` so users can switch workspaces from the application chrome or login experience. Those entry points MUST resolve their counterpart destination from the frontend's documented counterpart-app configuration instead of relying on duplicated inline localhost port literals in multiple app surfaces.

#### Scenario: Authenticated user switches workspaces

- **WHEN** an authenticated user is inside either SPA shell
- **THEN** the shell exposes a visible link to the counterpart workspace
- **AND** the switch entry is placed in the shared identity or top-bar area rather than hidden inside page-specific content
- **AND** the counterpart destination is derived from the frontend's configured counterpart workspace URL strategy

#### Scenario: Guest user finds the counterpart workspace

- **WHEN** a guest user is on a login or auth-entry surface
- **THEN** the experience exposes a visible link to the counterpart workspace
- **AND** the cross-link does not replace the primary login action for the current SPA
- **AND** the counterpart destination is derived from the frontend's configured counterpart workspace URL strategy

#### Scenario: Frontend workspace links stay aligned across apps

- **WHEN** either SPA updates its counterpart workspace URL configuration for local or deployed environments
- **THEN** the shell and login cross-links for that SPA use the same documented source of truth
- **AND** the implementation does not require duplicated inline localhost port values across multiple app views or layouts

## MODIFIED Requirements

### Requirement: Shared Authenticated Header Chrome Is Extractable

The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local.

#### Scenario: Header chrome is shared without sharing shell orchestration

- **WHEN** `user-web` and `admin-web` render the same authenticated top bar structure with only workspace and identity data differences
- **THEN** the duplicated top bar markup is implemented as a shared prop-driven Vue component
- **AND** app shells continue to own auth-store reads, environment-derived counterpart URLs, route names, router views, sidebars, and page composition

#### Scenario: Shared header owns the common profile dropdown shell only

- **WHEN** `user-web` and `admin-web` render the same authenticated profile dropdown trigger and menu shape
- **THEN** the shared header renders the display name, avatar trigger, open-state trigger styling, counterpart workspace dropdown action, and menu surface
- **AND** the counterpart workspace href and label drive the dropdown workspace action on all breakpoints
- **AND** the shared header does not render a standalone top-bar counterpart workspace link
- **AND** app shells provide the first-action label, icon, and route target
- **AND** the shared header emits sign-out intent without importing app auth stores, route names, session cleanup, or login redirect behavior

#### Scenario: User-web owns header center timer content

- **WHEN** `user-web` needs to render the compact top-bar timer in the shared header center region
- **THEN** the shared header allows app-owned center content without owning timer state, API calls, or task-picker behavior
- **AND** `admin-web` can keep the same shared header without rendering a top-bar timer
- **AND** the shared header layout remains stable when the center region is empty

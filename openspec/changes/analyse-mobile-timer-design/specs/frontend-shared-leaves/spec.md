## MODIFIED Requirements

### Requirement: Shared Authenticated Header Chrome Is Extractable

The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local.

#### Scenario: Header chrome is shared without sharing shell orchestration

- **WHEN** `user-web` and `admin-web` render the same authenticated top bar structure with only workspace and identity data differences
- **THEN** the duplicated top bar markup is implemented as a shared prop-driven Vue component
- **AND** app shells continue to own auth-store reads, environment-derived counterpart URLs, route names, router views, sidebars, and page composition

#### Scenario: Shared header omits settings/profile action after simplification

- **WHEN** the shared authenticated header surface is simplified to the invariant identity controls
- **THEN** the shared header renders the counterpart workspace link, display name, and avatar
- **AND** it does not render a shared settings/profile action

#### Scenario: User-web owns header center timer content

- **WHEN** `user-web` needs to render the compact top-bar timer in the shared header center region
- **THEN** the shared header allows app-owned center content without owning timer state, API calls, or task-picker behavior
- **AND** `admin-web` can keep the same shared header without rendering a top-bar timer
- **AND** the shared header layout remains stable when the center region is empty

#### Scenario: User-web center content may render as a mobile row

- **WHEN** `user-web` provides app-owned center content and the shared header renders below the mobile breakpoint
- **THEN** the shared header may render that center content as a row below the mobile top row
- **AND** the shared header still does not own timer state, timer API calls, or task-picker behavior
- **AND** `admin-web` keeps the same shared header without rendering an empty mobile center row

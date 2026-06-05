## MODIFIED Requirements

### Requirement: Shared Authenticated Header Chrome Is Extractable

The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local. The shared header SHALL allow app-specific identity text visibility and center-content alignment choices without owning app-specific timer or auth orchestration.

#### Scenario: Header chrome is shared without sharing shell orchestration

- **WHEN** `user-web` and `admin-web` render the same authenticated top bar structure with workspace, identity data, and app-specific center-content differences
- **THEN** the duplicated top bar markup is implemented as a shared prop-driven Vue component
- **AND** app shells continue to own auth-store reads, environment-derived counterpart URLs, route names, router views, sidebars, and page composition

#### Scenario: Shared header owns the common profile dropdown shell only

- **WHEN** `user-web` and `admin-web` render the same authenticated profile dropdown trigger and menu shape
- **THEN** the shared header renders the avatar trigger, open-state trigger styling, counterpart workspace dropdown action, and menu surface
- **AND** visible identity text in the closed trigger is controlled by the consuming app rather than rendered unconditionally
- **AND** the counterpart workspace href and label drive the dropdown workspace action on all breakpoints
- **AND** the shared header does not render a standalone top-bar counterpart workspace link
- **AND** app shells provide the first-action label, icon, and route target
- **AND** the shared header emits sign-out intent without importing app auth stores, route names, session cleanup, or login redirect behavior

#### Scenario: App-specific identity text visibility is preserved

- **GIVEN** `user-web` and `admin-web` both use the shared authenticated header
- **WHEN** `user-web` renders the profile/avatar trigger
- **THEN** user-web may hide visible display-name text and keep an avatar-only trigger
- **AND** activating the avatar-only trigger still opens the same profile dropdown actions
- **WHEN** `admin-web` renders the profile/avatar trigger
- **THEN** admin-web may keep visible display-name and scope text, including labels such as `PM scope: Project Orion`
- **AND** activating the admin trigger still opens the same profile dropdown actions

#### Scenario: Mobile timer support does not own profile actions

- **WHEN** the shared authenticated header renders the top-right identity/profile area
- **THEN** profile/settings menu ownership is governed by the active header/profile-menu requirements rather than by the mobile timer center-slot contract
- **AND** app shells continue to own profile/settings route targets, counterpart workspace URLs, and logout handlers when those actions exist
- **AND** this mobile timer change does not add timer state, timer API calls, or task-picker behavior to the top-right profile area

#### Scenario: User-web owns header center timer content

- **WHEN** `user-web` needs to render the compact top-bar timer in the shared header center region
- **THEN** the shared header allows app-owned center content without owning timer state, API calls, or task-picker behavior
- **AND** the shared header can align user-web center content toward the avatar/profile side at content width
- **AND** `admin-web` can keep the same shared header without rendering a top-bar timer
- **AND** the shared header layout remains stable when the center region is empty

#### Scenario: User-web center content may render as a mobile row

- **WHEN** `user-web` provides app-owned center content and the shared header renders below the mobile breakpoint
- **THEN** the shared header may render that center content as a row below the mobile top row
- **AND** the shared header still does not own timer state, timer API calls, or task-picker behavior
- **AND** `admin-web` keeps the same shared header without rendering an empty mobile center row

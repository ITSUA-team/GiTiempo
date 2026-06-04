# Frontend Layout Specification

## Purpose

Define shared SPA shell behavior for top-level layout, navigation, and responsive shell adjustments across user-web and admin-web.

## Requirements

### Requirement: Shared Application Shell

The user and admin SPAs SHALL use the same top-level shell pattern with top bar, sidebar, and main content region.

#### Scenario: Desktop shell layout

- GIVEN the application is viewed on desktop width
- WHEN a user opens either SPA
- THEN the shell shows a top bar, a full sidebar, and a main content area

#### Scenario: Top bar identity block

- GIVEN the application shell is rendered
- WHEN the top bar is shown
- THEN the left side displays the product identity and workspace name
- AND the right side displays user identity actions

### Requirement: Standalone Authenticated Error Routes

The shared application shell MUST allow route-level 403 and 404 pages in `user-web` and `admin-web` to render as standalone authenticated error surfaces outside the shell chrome.

#### Scenario: Authenticated error route bypasses shell chrome

- WHEN an authenticated user reaches a route-level 403 or 404 page in either SPA
- THEN the route may render without the shared top bar, sidebar, or shell main-content container
- AND the standalone error page remains distinct from feature-level empty or request-error states rendered inside normal product pages

### Requirement: User-Web Top-Bar Timer Center Region

The authenticated user-web shell MUST reserve the top-bar center region for the compact timer surface on tablet and desktop, and MUST render the approved mobile timer strip inside shell chrome below the mobile top row while preserving the shared shell pattern and keeping admin-web unaffected.

#### Scenario: User-web top bar shows compact timer center content

- GIVEN the authenticated user-web shell is rendered at tablet or desktop width
- WHEN the top bar is shown
- THEN the left side displays the product identity and workspace name
- AND the center region displays the compact top-bar timer surface
- AND the right side displays the header-owned identity/profile controls defined by the active shell requirements

#### Scenario: User-web mobile shell shows selected timer strip

- GIVEN the authenticated user-web shell is rendered below the mobile breakpoint
- WHEN the top bar is shown
- THEN the product identity and user identity controls remain in the mobile top row
- AND the timer renders as a full-width shell strip below that top row using the approved `GITiempo.pen` mobile timer design
- AND the timer Start or Stop action and Change task action remain reachable outside the top-right identity/avatar control area

#### Scenario: Mobile timer actions remain usable beside the right identity/profile region

- GIVEN the authenticated user-web shell is rendered below the mobile breakpoint
- AND the shell renders the top-right identity/avatar region
- WHEN the mobile timer strip is visible and the right identity/profile region occupies the top-right shell area
- THEN the timer Start or Stop action remains visible and actionable
- AND the Change task action remains visible and actionable
- AND this scenario does not require a profile menu overlay to exist

#### Scenario: Mobile timer remains compatible with separately specified profile menu overlay

- GIVEN active header or profile-menu requirements specify a header-owned profile menu overlay opened from the top-right identity/avatar trigger
- AND the authenticated user-web shell is rendered below the mobile breakpoint
- WHEN that profile menu overlay is open while the mobile timer strip is visible
- THEN the timer Start or Stop action remains visible and actionable
- AND the Change task action remains visible and actionable
- AND any overlap from the profile menu overlay is limited to non-critical task metadata
- AND this mobile timer requirement does not create a new profile menu owner or move profile/menu action ownership into the timer

#### Scenario: Admin-web top bar has no timer center content

- GIVEN the authenticated admin-web shell is rendered
- WHEN the top bar is shown
- THEN the shell does not render a compact timer surface
- AND the existing admin-web top-bar identity/profile controls remain available according to the active shell requirements

#### Scenario: Compact timer fits top-bar height

- GIVEN the user-web top bar uses the documented `h-16` shell height on tablet and desktop
- WHEN the compact timer renders in running, idle, loading, error, or disabled state
- THEN the timer surface remains compact enough to fit the top bar
- AND smaller tablet and desktop widths truncate task context text before removing the elapsed time value or timer action

#### Scenario: Mobile timer strip remains compatible with bottom navigation

- GIVEN the user-web shell is rendered below the mobile breakpoint
- WHEN the mobile timer strip and mobile bottom navigation are both visible
- THEN the timer strip remains attached to the top shell chrome
- AND the mobile bottom navigation remains visible and independently usable
- AND page content does not become the owner of timer start, stop, or task-switching controls

### Requirement: Top-Bar Profile Dropdown Menu

The authenticated user-web and admin-web shells SHALL expose profile actions through a dropdown menu anchored to the top-bar profile/avatar trigger.

#### Scenario: User-web profile menu opens from header identity trigger

- **GIVEN** an authenticated user-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** the menu contains `Admin workspace`, `Profile`, and `Sign out` actions in that order
- **AND** the shell navigation does not render a duplicate `Profile` item
- **AND** the `Profile` action uses the same profile icon family as the user-web profile navigation item
- **AND** the existing user-web top-bar timer remains visible
- **AND** the user Profile page does not render a duplicate page-content `Sign out` action

#### Scenario: Admin-web profile menu opens from header identity trigger

- **GIVEN** an authenticated admin-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** the menu contains `User workspace`, `Settings`, and `Sign out` actions in that order
- **AND** the shell navigation does not render a duplicate `Settings` item
- **AND** the `Settings` action keeps the settings gear icon
- **AND** the admin profile trigger identity text remains visible, including the current admin scope label when the shell renders one, such as `PM scope: Project Orion`

#### Scenario: Profile menu exposes counterpart workspace switch

- **GIVEN** an authenticated shell is rendered
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** the dropdown includes the counterpart workspace action above the app-owned profile/settings action
- **AND** user-web labels that action `Admin workspace`
- **AND** admin-web labels that action `User workspace`
- **AND** the action uses the configured counterpart workspace href
- **AND** the shell does not render a standalone top-bar counterpart workspace text link
- **AND** the app-owned profile/settings action and `Sign out` action remain available in the same dropdown

#### Scenario: Profile/settings action navigates to app-owned settings surface

- **GIVEN** the profile dropdown menu is open
- **WHEN** the user activates the app-owned profile/settings action
- **THEN** user-web navigates to its existing profile/settings surface
- **AND** admin-web navigates to its existing settings surface
- **AND** the navigation uses the authenticated route tree rather than a public entry page

#### Scenario: Sign out action uses existing logout behavior

- **GIVEN** the profile dropdown menu is open
- **WHEN** the user activates `Sign out`
- **THEN** the current SPA starts its existing logout flow
- **AND** local session cleanup and guest-route behavior remain governed by the existing auth requirements for that SPA
- **AND** the user is redirected to that SPA's login route after logout cleanup completes

#### Scenario: Profile menu remains keyboard accessible

- **GIVEN** focus is on the top-bar profile/avatar trigger
- **WHEN** the user opens the menu with keyboard input
- **THEN** focus can move through the counterpart workspace action, app-owned profile/settings action, and `Sign out`
- **AND** activating a focused item performs the same action as clicking it
- **AND** dismissing the menu returns focus to the profile/avatar trigger

#### Scenario: Profile menu remains available on narrow layouts

- **GIVEN** the authenticated shell is rendered below desktop width
- **WHEN** optional top-bar identity text is hidden for space
- **THEN** the avatar/profile trigger remains available
- **AND** activating it still opens the same app-owned profile/settings action and `Sign out` menu

### Requirement: Responsive Navigation Adjustment

The frontend MUST adapt shell navigation for mobile and tablet breakpoints.

#### Scenario: Mobile navigation behavior

- GIVEN the SPA is viewed below the mobile breakpoint threshold
- WHEN the shell renders
- THEN the sidebar is hidden
- AND navigation is available through the mobile navigation pattern

#### Scenario: Tablet navigation behavior

- GIVEN the SPA is viewed on tablet width
- WHEN the shell renders
- THEN the sidebar collapses to an icon-focused compact mode

### Requirement: Consistent Page Header Pattern

Every SPA page MUST use the shared page-header structure with title, subtitle, and primary action alignment, and repeated page-header chrome SHALL flow through the documented shared component conventions.

#### Scenario: Page renders standard header block

- **GIVEN** a product page is rendered in either SPA
- **WHEN** the header is shown
- **THEN** it SHALL display a page title and subtitle
- **AND** the primary action SHALL align to the right side of the header block on desktop layouts.

#### Scenario: Repeated page header uses shared structure

- **WHEN** a `user-web`, `admin-web`, or shared Vue page needs the documented title, subtitle, and action header surface
- **THEN** it SHALL use the established shared page-header component or structure instead of duplicating bespoke wrapper markup
- **AND** app-specific copy, route actions, and slots SHALL remain owned by the consuming page.

#### Scenario: Header action hierarchy remains clear on narrow layouts

- **WHEN** the page header renders below the mobile breakpoint
- **THEN** title, subtitle, and primary action SHALL remain reachable in a predictable order
- **AND** responsive stacking SHALL preserve the documented primary action hierarchy instead of hiding the action in decorative chrome.

#### Scenario: Page header styling uses design-system primitives

- **WHEN** page-header spacing, text, surface, border, radius, or shadow styling is added or changed
- **THEN** it SHALL use documented design-system tokens and shared PrimeVue/Tailwind conventions
- **AND** it SHALL NOT introduce raw visual values, `!important` utilities, or deep selectors for standard header styling.

### Requirement: Stats Page Header Pattern Uses Shared Header Structure

Pages with stat-card summaries SHALL use the same shared header structure as standard page headers while preserving the stat-card row below the title/action row.

#### Scenario: Page header includes action without stats row

- **WHEN** a product page renders a title, subtitle, and primary action without stat-card summary content
- **THEN** the title/subtitle and action align through the shared page header structure
- **AND** the page does not use a stats-header layout only to achieve action alignment
- **AND** no empty stats row is rendered

#### Scenario: Page header includes stats row

- **WHEN** a product page renders a title, subtitle, primary action, and stat-card summary row
- **THEN** the title/subtitle and action align through the shared header structure
- **AND** the stat-card row appears below that header row with the documented management-page spacing

#### Scenario: Page without stats keeps standard header behavior

- **WHEN** a product page does not provide stat-card summary content or a primary action
- **THEN** the shared header renders the standard page or section header without an empty stats row

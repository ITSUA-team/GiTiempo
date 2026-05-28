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

The authenticated user-web shell MUST reserve the top-bar center region for the compact timer surface while preserving the shared shell pattern and keeping admin-web unaffected.

#### Scenario: User-web top bar shows compact timer center content

- GIVEN the authenticated user-web shell is rendered
- WHEN the top bar is shown
- THEN the left side displays the product identity and workspace name
- AND the center region displays the compact top-bar timer surface
- AND the right side displays counterpart workspace and user identity controls

#### Scenario: Admin-web top bar has no timer center content

- GIVEN the authenticated admin-web shell is rendered
- WHEN the top bar is shown
- THEN the shell does not render a compact timer surface
- AND the existing admin-web top-bar identity and counterpart workspace controls remain available

#### Scenario: Compact timer fits top-bar height

- GIVEN the user-web top bar uses the documented `h-16` shell height
- WHEN the compact timer renders in running, idle, loading, error, or disabled state
- THEN the timer surface remains compact enough to fit the top bar
- AND smaller widths truncate task context text before removing the elapsed time value or timer action

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

Every SPA page MUST use a shared page-header structure with title, subtitle, and primary action alignment.

#### Scenario: Page renders standard header block

- GIVEN a product page is rendered in either SPA
- WHEN the header is shown
- THEN it displays a page title and subtitle
- AND the primary action aligns to the right side of the header block

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

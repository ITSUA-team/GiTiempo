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

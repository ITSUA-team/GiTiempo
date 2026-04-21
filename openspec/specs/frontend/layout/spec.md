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

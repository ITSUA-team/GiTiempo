## MODIFIED Requirements

### Requirement: Authenticated Page Entry Expectations
Each member-facing product page in the user-web app MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route. Route-level 403 and 404 pages are standalone authenticated error-page exceptions to this shell-owned page-entry rule.

#### Scenario: Member product page loads through authenticated route tree
- **WHEN** a user opens a dashboard, time entries, project view, or profile page in the user-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

#### Scenario: Route-level error page stays outside shell chrome
- **WHEN** an authenticated user reaches a user-web route-level 403 or 404 page
- **THEN** the page remains part of the authenticated route tree
- **AND** the page may render as a standalone error surface without shared shell chrome

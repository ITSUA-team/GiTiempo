## ADDED Requirements

### Requirement: Standalone Authenticated Error Routes
The user-web router MUST expose authenticated route-level 403 and 404 pages as standalone surfaces outside the shared app shell.

#### Scenario: Authenticated user reaches standalone 403 route
- **WHEN** an authenticated user navigates to the user-web 403 route
- **THEN** the router resolves the forbidden page as an authenticated route
- **AND** the page renders outside the shared authenticated shell

#### Scenario: Authenticated user reaches standalone 404 route
- **WHEN** an authenticated user navigates to an unknown user-web route
- **THEN** the router resolves the not-found page as an authenticated route
- **AND** the page renders outside the shared authenticated shell

#### Scenario: Anonymous user reaches standalone protected error route
- **WHEN** an anonymous browser session navigates to the user-web 403 route or an unknown user-web route
- **THEN** the router redirects the user to the login route
- **AND** the originally requested destination is preserved for post-login continuation

### Requirement: User-Web 404 Back Action Visibility
The user-web standalone 404 page MUST show its secondary `Go back` action only when the browser history contains a prior entry for the current tab.

#### Scenario: 404 page shows back action when history exists
- **WHEN** an authenticated user reaches the user-web standalone 404 page with a prior browser-history entry in the current tab
- **THEN** the page shows the secondary `Go back` action next to `Back to dashboard`

#### Scenario: 404 page omits back action when history is empty
- **WHEN** an authenticated user reaches the user-web standalone 404 page without a prior browser-history entry in the current tab
- **THEN** the page omits the secondary `Go back` action
- **AND** `Back to dashboard` remains available as the primary action

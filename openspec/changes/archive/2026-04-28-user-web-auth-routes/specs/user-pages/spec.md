## ADDED Requirements

### Requirement: Login Entry Page

The user-web app MUST provide a dedicated login page that matches the approved entry design and exposes the supported authentication methods.

#### Scenario: Login page renders approved entry sections

- **WHEN** an anonymous user opens the login route
- **THEN** the page shows the branded hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action

### Requirement: Authenticated Page Entry Expectations

Each member-facing page in the user-web app MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Member page loads through authenticated route tree

- **WHEN** a user opens any member-facing page in the user-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

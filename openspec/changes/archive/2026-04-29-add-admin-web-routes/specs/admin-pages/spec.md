## ADDED Requirements

### Requirement: Admin Login Entry Page

The `admin-web` app MUST provide a dedicated login page that offers the supported authentication methods and keeps the admin product visually distinct while following the shared auth direction.

#### Scenario: Login page renders admin entry sections

- **WHEN** an anonymous user opens the admin login route
- **THEN** the page shows the branded admin hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action
- **AND** the page exposes a visible link back to `user-web`

### Requirement: Authenticated Admin Page Entry Expectations

Each admin-facing page in `admin-web` MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Admin page loads through authenticated route tree

- **WHEN** a user opens any admin-facing page in the admin-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

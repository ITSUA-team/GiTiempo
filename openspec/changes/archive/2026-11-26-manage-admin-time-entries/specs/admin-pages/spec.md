## MODIFIED Requirements

### Requirement: Authenticated Admin Page Entry Expectations

Each admin-facing product page in `admin-web` MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route. Route-level 403 and 404 pages are standalone authenticated error-page exceptions to this shell-owned page-entry rule.

#### Scenario: Admin product page loads through authenticated route tree

- **WHEN** a user opens a dashboard, reports, time entries, invoices, members, projects, or settings page in the admin-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

#### Scenario: Route-level admin error page stays outside shell chrome

- **WHEN** an authenticated user reaches an admin-web route-level 403 or 404 page
- **THEN** the page remains part of the authenticated route tree
- **AND** the page may render as a standalone error surface without shared shell chrome

### Requirement: Role-Aware Admin Shell Navigation

The authenticated `admin-web` shell MUST render navigation affordances only for product routes available to the current user's workspace role.

#### Scenario: Member denial stays outside admin shell navigation

- **WHEN** an authenticated user with workspace role `member` reaches an allowed admin-web surface such as the standalone `/403` route
- **THEN** the standalone route-level page renders without admin shell chrome
- **AND** the user is not offered sidebar, mobile navigation, or profile-menu route actions that would open admin-only or PM-only product routes

#### Scenario: Member forbidden recovery does not loop

- **WHEN** an authenticated user with workspace role `member` reaches the standalone admin-web `/403` route
- **THEN** the primary recovery action switches to the configured user workspace destination
- **AND** the page does not render `Back to dashboard` as the primary recovery action for the member role

#### Scenario: Admin and PM forbidden recovery can return to dashboard

- **WHEN** an authenticated user with workspace role `admin` or `pm` reaches the standalone admin-web `/403` route
- **THEN** the page may render `Back to dashboard` as the primary recovery action
- **AND** that primary action targets an admin product route available to the current role

#### Scenario: PM sees only PM-allowed product navigation

- **WHEN** an authenticated user with workspace role `pm` renders the admin-web shell
- **THEN** the shell shows navigation entries for admin product routes available to PM users
- **AND** the shell omits navigation entries and profile-menu route actions that open admin-only pages

#### Scenario: Admin sees the full current admin navigation

- **WHEN** an authenticated user with workspace role `admin` renders the admin-web shell
- **THEN** the shell shows the current documented admin navigation entries for available admin product pages
- **AND** the profile settings entry remains available to the admin user

#### Scenario: Direct URL denial remains distinct from hidden navigation

- **WHEN** a user's workspace role does not allow a hidden admin-web navigation destination and the user enters that destination URL directly
- **THEN** route-level authorization redirects the user to `/403`
- **AND** the shell does not rely on hidden navigation as the only access control mechanism

#### Scenario: Time Entries navigation uses workspace management roles
- **GIVEN** an authenticated Admin or PM, including a PM without invoice viewing permission
- **WHEN** the desktop sidebar or mobile navigation renders
- **THEN** it offers an accessible Time Entries link and marks it active on the Time Entries page

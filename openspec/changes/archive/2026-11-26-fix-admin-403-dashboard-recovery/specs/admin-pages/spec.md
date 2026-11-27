## MODIFIED Requirements

### Requirement: Role-Aware Admin Shell Navigation

The authenticated `admin-web` shell MUST render navigation affordances only for product routes available to the current user's workspace role.

#### Scenario: Member denial stays outside admin shell navigation

- **WHEN** an authenticated user with workspace role `member` reaches an allowed admin-web surface such as the standalone `/403` route
- **THEN** the standalone route-level page renders without admin shell chrome
- **AND** the user is not offered sidebar, mobile navigation, or profile-menu route actions that would open admin-only or PM-only product routes

#### Scenario: Member forbidden recovery does not loop

- **GIVEN** an authenticated user with workspace role `member` is on the standalone admin-web `/403` page
- **WHEN** the user activates the primary `Back to dashboard` action
- **THEN** the browser opens the dashboard at the root of the configured user-web origin for the active workspace
- **AND** this action is available even when the member has only one workspace membership

#### Scenario: Admin and PM forbidden recovery can return to dashboard

- **GIVEN** an authenticated user with workspace role `admin` or `pm` is on the standalone admin-web `/403` page
- **WHEN** the user activates the primary `Back to dashboard` action
- **THEN** the admin dashboard opens for the active workspace

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

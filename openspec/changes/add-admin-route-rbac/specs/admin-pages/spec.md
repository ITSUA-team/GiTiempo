## ADDED Requirements

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

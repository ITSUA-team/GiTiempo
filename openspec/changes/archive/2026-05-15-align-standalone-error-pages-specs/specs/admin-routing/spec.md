## MODIFIED Requirements

### Requirement: Auth-Aware Admin Entry Structure
The `admin-web` SPA MUST separate guest-only entry from authenticated application routes so admin navigation aligns with the shared web auth direction.

#### Scenario: Guest entry route exists
- **WHEN** an unauthenticated user enters the admin SPA
- **THEN** the router provides a guest-only login entry route
- **AND** authenticated admin pages are not mounted as public routes

#### Scenario: Normal authenticated admin pages are grouped
- **WHEN** the admin-web router defines authenticated product routes for dashboard, reports, invoices, members, projects, and settings
- **THEN** those protected routes are mounted under the shared admin shell structure
- **AND** the guest-only login route remains outside that authenticated shell

#### Scenario: Authenticated admin error routes stay standalone
- **WHEN** the admin-web router defines route-level 403 and 404 pages
- **THEN** those protected routes may render outside the shared admin shell structure
- **AND** they remain authenticated admin routes rather than guest entry pages

## ADDED Requirements

### Requirement: Projects Navigation Item Is Active On Project Subpages

The admin-web navigation MUST mark the "Projects" item as active whenever the user is on any page under the projects section, including the Add Project page.

#### Scenario: Projects nav item is active on Add Project page

- **WHEN** an authenticated admin user is on the `/projects/new` route
- **THEN** the "Projects" navigation item is rendered in the active state
- **AND** no other navigation item is rendered as active

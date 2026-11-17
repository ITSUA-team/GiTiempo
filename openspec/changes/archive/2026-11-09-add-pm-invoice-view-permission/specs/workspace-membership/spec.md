# Delta: workspace-membership

## Added Requirements

### Requirement: Workspace Membership Includes Invoice View Permission

The `workspace_members` table SHALL include a `can_view_invoices` boolean column defaulting to `false`. This column controls whether a PM member can access invoice endpoints and pages for their workspace.

#### Scenario: New membership defaults to denied

- **GIVEN** a new workspace membership is created
- **WHEN** the membership record is persisted
- **THEN** the `can_view_invoices` column is `false`

#### Scenario: Admin enables invoice view for a PM

- **GIVEN** the requester is an admin member of the current workspace
- **AND** the target member is a PM in the same workspace
- **WHEN** the admin sets `canViewInvoices` to `true` via `PATCH /members/:id/permissions`
- **THEN** the system updates the membership's `can_view_invoices` column to `true`
- **AND** returns the updated member response including `canViewInvoices: true`

#### Scenario: Admin disables invoice view for a PM

- **GIVEN** the requester is an admin and the target PM currently has `canViewInvoices = true`
- **WHEN** the admin sets `canViewInvoices` to `false`
- **THEN** the system updates the column to `false`
- **AND** returns the updated member response including `canViewInvoices: false`

#### Scenario: Non-admin cannot update permissions

- **GIVEN** the requester is authenticated but is not an admin
- **WHEN** the requester attempts to update member permissions
- **THEN** the system rejects the request as forbidden

#### Scenario: Updating permissions for a non-PM member

- **GIVEN** the target member is an admin or a member (not a PM)
- **WHEN** an admin updates `canViewInvoices`
- **THEN** the system persists the value
- **AND** the value has no effect on admin or member invoice access (admins always have access, members never do)

### Requirement: Member List Response Includes Invoice View Permission

The workspace member list response SHALL include the `canViewInvoices` boolean for each member.

#### Scenario: Member list includes canViewInvoices field

- **GIVEN** an admin lists workspace members
- **WHEN** the response is returned
- **THEN** each member record includes a `canViewInvoices` boolean reflecting the persisted value

### Requirement: Admin Can Update Member Invoice View Permission

The backend MUST provide a `PATCH /members/:id/permissions` endpoint (admin-only) that accepts `{ canViewInvoices: boolean }` and updates the target membership.

#### Scenario: Admin updates PM invoice permission

- **GIVEN** the requester is an admin
- **WHEN** the admin sends `PATCH /members/:id/permissions` with `{ canViewInvoices: true }`
- **THEN** the system updates the membership and returns the updated member response

#### Scenario: Invalid permissions payload is rejected

- **GIVEN** the requester is an admin
- **WHEN** the admin sends `PATCH /members/:id/permissions` with an unknown field
- **THEN** the system rejects the request as invalid
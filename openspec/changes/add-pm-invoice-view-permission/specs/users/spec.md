# Delta: users

## Modified Requirements

### Requirement: Stable Frontend Current User Contract

The backend MUST shape current-user responses according to the shared public user contract, which now includes `canViewInvoices`.

#### Scenario: Public contract excludes internal auth identifiers and includes role

- **GIVEN** the backend serializes the authenticated current user
- **WHEN** the response body is produced
- **THEN** fields like internal Firebase UID are excluded
- **AND** the user's workspace role is included
- **AND** only the public user contract fields are returned

#### Scenario: Public contract includes canViewInvoices

- **GIVEN** the backend serializes the authenticated current user
- **WHEN** the response body is produced
- **THEN** the response includes the user's `canViewInvoices` boolean from their workspace membership
- **AND** the value reflects the current `workspace_members.can_view_invoices` column for the user's active workspace membership

#### Scenario: Current user response for PM with invoice permission

- **GIVEN** an authenticated PM with `canViewInvoices = true`
- **WHEN** the current-user endpoint is requested
- **THEN** the response includes `canViewInvoices: true`

#### Scenario: Current user response for PM without invoice permission

- **GIVEN** an authenticated PM with `canViewInvoices = false`
- **WHEN** the current-user endpoint is requested
- **THEN** the response includes `canViewInvoices: false`

#### Scenario: Current user response for admin includes canViewInvoices

- **GIVEN** an authenticated admin
- **WHEN** the current-user endpoint is requested
- **THEN** the response includes `canViewInvoices` reflecting the persisted column value
- **AND** the value does not affect the admin's invoice access (admins always have full access)
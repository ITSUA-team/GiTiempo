# Delta: admin-members-page

## Added Requirements

### Requirement: PM Invoice View Permission Toggle In Member Settings

The member edit form SHALL render an "Allow viewing invoices" toggle (checkbox or switch) within the "Member settings" panel when the expanded member's role is `pm`. The toggle reflects the member's current `canViewInvoices` value. Only admins can see and change it.

#### Scenario: Checkbox visible for PM member

- **GIVEN** an admin expands a PM member's row in the members table
- **WHEN** the member edit form renders
- **THEN** an "Allow viewing invoices" checkbox is visible
- **AND** the checkbox reflects the member's current `canViewInvoices` value

#### Scenario: Checkbox hidden for admin or member role

- **GIVEN** an admin expands an admin or member (non-PM) row
- **WHEN** the member edit form renders
- **THEN** the "Allow viewing invoices" checkbox is not rendered

#### Scenario: Admin toggles invoice permission on

- **GIVEN** the checkbox is visible and currently unchecked
- **WHEN** the admin checks it
- **THEN** the form emits an update event with `canViewInvoices: true`
- **AND** the parent view calls `PATCH /members/:id/permissions`
- **AND** a success toast is shown on success
- **AND** the member list is refreshed

#### Scenario: Admin toggles invoice permission off

- **GIVEN** the checkbox is visible and currently checked
- **WHEN** the admin unchecks it
- **THEN** the form emits an update event with `canViewInvoices: false`
- **AND** the parent view calls `PATCH /members/:id/permissions`
- **AND** a success toast is shown on success

#### Scenario: Permission update error shows feedback

- **GIVEN** the admin toggles the checkbox
- **WHEN** the `PATCH /members/:id/permissions` call fails
- **THEN** an error toast is shown
- **AND** the checkbox reverts to the previous value
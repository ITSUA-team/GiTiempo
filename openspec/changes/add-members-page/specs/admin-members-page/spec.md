## ADDED Requirements

### Requirement: Members Page Header And Stat Counters

The admin Members page SHALL render a page header and three stat counters that reflect the current workspace membership and invite state.

#### Scenario: Header renders title, description, and primary action

- **GIVEN** an admin opens the Members page
- **WHEN** the page renders
- **THEN** the page header shows the title `Members` and a supporting description
- **AND** the header exposes a primary `Invite Member` action aligned to the top-right of the header row

#### Scenario: Stat counters reflect current data

- **GIVEN** the page has loaded the workspace member list and the pending invite list
- **WHEN** the stat counter row renders
- **THEN** the page shows three stat cards
- **AND** the first card labeled `Active Members` shows the count of returned workspace members
- **AND** the second card labeled `Pending Invites` shows the count of returned pending invites
- **AND** the third card labeled `PMs Assigned` shows the count of returned members whose role is `pm`

#### Scenario: Stat counters reuse the shared stat card and stats header components

- **WHEN** the header and stat counters render
- **THEN** the page reuses the shared stats header pattern and the shared stat card pattern used by the admin Projects page
- **AND** the page does not introduce a parallel app-local copy of those patterns

### Requirement: Invite Member Dialog

The admin Members page MUST provide an `Invite Member` dialog that creates a pending workspace invite.

#### Scenario: Dialog exposes invite form fields

- **GIVEN** the admin clicks the `Invite Member` action
- **WHEN** the dialog opens
- **THEN** the dialog shows an email input and a role selector with options `Member`, `PM`, and `Admin`
- **AND** the dialog shows `Cancel` and `Send Invite` actions

#### Scenario: Dialog rejects invalid input

- **GIVEN** the invite dialog is open
- **WHEN** the admin submits with an invalid email or no role selected
- **THEN** the dialog shows field-level validation feedback
- **AND** no invite request is sent

#### Scenario: Dialog creates a pending invite on success

- **GIVEN** the invite dialog is open with a valid email and role
- **WHEN** the admin submits the form
- **THEN** the page sends a create-invite request for that email and role
- **AND** on success the dialog closes
- **AND** the page shows a success notification
- **AND** the `Pending Invites` counter increases by one without requiring a manual reload

#### Scenario: Dialog surfaces backend errors

- **GIVEN** the invite dialog is open with valid input
- **WHEN** the create-invite request fails or is rejected as conflicting
- **THEN** the dialog stays open
- **AND** the page shows an error notification with the rejection reason

### Requirement: Members Table Columns And Data

The Members page MUST render a workspace member list with the documented columns sourced from the workspace member contract.

#### Scenario: Members table renders the documented columns

- **GIVEN** the page has loaded the workspace member list
- **WHEN** the table renders
- **THEN** the table shows the columns `Member`, `Role`, `Projects Assigned`, `Last Active`, and `Actions`
- **AND** the `Member` cell shows an avatar, display name, and email
- **AND** the `Projects Assigned` cell shows the per-member assigned project count returned by the workspace member contract
- **AND** the `Last Active` cell shows the per-member last-active timestamp returned by the workspace member contract, or a placeholder when the value is null

#### Scenario: Members table reuses the shared management table chrome

- **WHEN** the table renders
- **THEN** the table renders through the shared management table chrome used by the admin Projects table
- **AND** the page does not introduce a parallel app-local copy of that chrome

### Requirement: Inline PM Assignment Expansion

The Members page MUST provide an inline `Assign PM` expansion under non-admin member rows that updates project assignments for that member.

#### Scenario: Expansion shows project checkboxes pre-filled with current assignments

- **GIVEN** an admin selects `Assign PM` on a non-admin member row
- **WHEN** the row expands
- **THEN** the expansion shows a `PM assignment` panel beneath that row
- **AND** the panel lists active workspace projects as checkboxes
- **AND** projects that already include this member are pre-checked

#### Scenario: Save Assignments applies the diff

- **GIVEN** the expansion is open with at least one checkbox change
- **WHEN** the admin clicks `Save Assignments`
- **THEN** the page issues an assignment-create request for each newly-checked project
- **AND** the page issues an assignment-remove request for each newly-unchecked project
- **AND** on success the expansion collapses and the member list refreshes

#### Scenario: Cancel discards changes

- **GIVEN** the expansion is open with checkbox changes
- **WHEN** the admin clicks `Cancel`
- **THEN** the expansion collapses without sending any requests
- **AND** the row state returns to the unchanged member assignments on next reopen

#### Scenario: Admin members do not show inline assignment

- **GIVEN** a member with role `admin`
- **WHEN** the row renders
- **THEN** the row does not show the `Assign PM` action

### Requirement: Edit Member Inline Form

The Members page MUST provide an inline edit panel that updates a member's role.

#### Scenario: Edit panel shows the documented fields

- **GIVEN** an admin selects `Edit` on a member row
- **WHEN** the row expands
- **THEN** the panel shows `Name`, `Email`, and `Role` fields in that order
- **AND** the `Role` field is editable with options `Member`, `PM`, and `Admin`

#### Scenario: Save updates the role

- **GIVEN** the panel is open with a role change
- **WHEN** the admin saves the form
- **THEN** the page issues a member-role update for that member
- **AND** on success the panel collapses and the member list refreshes
- **AND** the page shows a success notification

#### Scenario: Save surfaces last-admin protection failure

- **GIVEN** the panel is open and changing the only admin member to a non-admin role
- **WHEN** the admin saves the form
- **THEN** the page surfaces the backend rejection
- **AND** the panel stays open

### Requirement: Remove Member Confirmation

The Members page MUST gate member removal behind a destructive confirmation dialog and reuse the shared confirmation pattern.

#### Scenario: Remove opens a destructive confirmation

- **GIVEN** an admin selects `Remove` on a member row
- **WHEN** the action is invoked
- **THEN** the page opens a destructive confirmation dialog using the shared confirmation pattern
- **AND** the confirm action is styled as destructive

#### Scenario: Confirming removes the member

- **GIVEN** the confirmation is open
- **WHEN** the admin confirms removal
- **THEN** the page issues a member-remove request for that member
- **AND** on success the page shows a success notification and refreshes the member list

#### Scenario: Cancelling preserves the member

- **GIVEN** the confirmation is open
- **WHEN** the admin cancels
- **THEN** the dialog closes without sending any request

#### Scenario: Removal surfaces last-admin protection failure

- **GIVEN** the confirmation is open for the only admin member
- **WHEN** the admin confirms removal
- **THEN** the page surfaces the backend rejection
- **AND** the member is not removed

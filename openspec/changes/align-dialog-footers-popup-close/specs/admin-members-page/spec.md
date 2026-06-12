## MODIFIED Requirements

### Requirement: Invite Member Dialog

The admin Members page MUST provide an `Invite Member` dialog that creates a pending workspace invite and follows the shared non-destructive popup footer pattern.

#### Scenario: Dialog validates and creates invite
- **GIVEN** the admin opens the invite dialog
- **WHEN** the dialog renders
- **THEN** it shows email and role fields with `Send Invite` as the only footer action
- **AND** the dialog footer does not show a `Cancel` dismissal button
- **AND** invalid email or missing role shows field-level validation without sending a request
- **AND** successful invite creation closes the dialog, shows success notification, and updates the pending invite count
- **AND** backend errors keep the dialog open and show the rejection reason

#### Scenario: Invite dialog dismissal uses popup close control
- **GIVEN** the invite dialog is open and not submitting
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating an invite

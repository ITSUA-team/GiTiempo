## ADDED Requirements

### Requirement: Pending Invitations Card
The Admin Members page SHALL render pending workspace invitations in a separate card below the members table.

#### Scenario: Pending invitations render documented fields
- **GIVEN** the admin opens the Members page
- **AND** pending invitations have loaded
- **WHEN** the pending invitations card renders
- **THEN** desktop and tablet layouts show Email, Role, Expires, and Actions columns
- **AND** mobile layout renders stacked records with the same fields
- **AND** the card uses the shared management-table/card visual language from the approved Admin Members design

#### Scenario: Pending invitations empty state
- **GIVEN** the invite list loads successfully with no pending invitations
- **WHEN** the pending invitations card renders
- **THEN** the page shows a distinct empty state for pending invitations
- **AND** it does not render the request-error state

#### Scenario: Pending invitations request error
- **GIVEN** the members data required by the page is available
- **AND** loading pending invitations fails
- **WHEN** the pending invitations card renders
- **THEN** the page shows a retryable request-error state scoped to pending invitations
- **AND** the error state remains distinct from an empty invite list

### Requirement: Pending Invitation Actions
The Admin Members page MUST provide accessible icon-only `Resend invite` and `Cancel invite` actions for each pending invitation.

#### Scenario: Resend pending invite
- **GIVEN** the admin selects `Resend invite` for a pending invitation
- **WHEN** the resend request succeeds
- **THEN** the page shows success toast feedback
- **AND** refreshes pending invite data

#### Scenario: Resend pending invite failure
- **GIVEN** the admin selects `Resend invite` for a pending invitation
- **WHEN** the resend request fails
- **THEN** the page shows error toast feedback using the backend message when available
- **AND** keeps the pending invitation row visible

#### Scenario: Cancel pending invite
- **GIVEN** the admin selects `Cancel invite` for a pending invitation
- **WHEN** the action is invoked
- **THEN** the page opens the shared destructive confirmation dialog
- **AND** confirming issues the cancel request, refreshes pending invite data, and shows success toast feedback
- **AND** cancelling sends no request

#### Scenario: Cancel pending invite failure
- **GIVEN** the admin confirms `Cancel invite` for a pending invitation
- **WHEN** the cancel request fails
- **THEN** the page shows error toast feedback using the backend message when available
- **AND** keeps the pending invitation row visible

#### Scenario: Pending invitation actions are accessible
- **GIVEN** the pending invitations card renders
- **WHEN** row actions are visible
- **THEN** each action is icon-only with a text tooltip
- **AND** each action exposes an accessible label matching `Resend invite` or `Cancel invite`

## MODIFIED Requirements

### Requirement: Shared Workspace Invite Contract
The shared contracts SHALL define stable shapes for invite creation, listing, resend, cancellation, and acceptance.

#### Scenario: Invite flow uses shared schema
- **GIVEN** the backend accepts or returns workspace invite data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace invite contract

#### Scenario: Invite resend response uses shared schema
- **GIVEN** an admin resends a pending invite
- **WHEN** the backend returns the resend response
- **THEN** the payload matches the shared workspace invite response contract
- **AND** no request body schema is required for the resend endpoint

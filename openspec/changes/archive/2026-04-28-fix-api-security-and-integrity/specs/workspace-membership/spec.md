## MODIFIED Requirements

### Requirement: Last Admin Protection
The system MUST prevent the workspace from losing its final admin membership. Admin mutations that check the admin count MUST be serialized per workspace to prevent concurrent operations from violating this invariant.

#### Scenario: Last admin cannot be demoted
- **GIVEN** the target membership is the only admin membership in the workspace
- **WHEN** an admin attempts to change that membership to a non-admin role
- **THEN** the system rejects the request

#### Scenario: Last admin cannot be removed
- **GIVEN** the target membership is the only admin membership in the workspace
- **WHEN** an admin attempts to remove that membership
- **THEN** the system rejects the request

#### Scenario: Concurrent demote operations on last two admins
- **GIVEN** a workspace has exactly two admin memberships
- **AND** two concurrent requests attempt to demote each admin to a non-admin role
- **WHEN** both requests are processed
- **THEN** exactly one request SHALL succeed and the other SHALL be rejected
- **AND** the workspace SHALL retain at least one admin membership

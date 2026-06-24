## MODIFIED Requirements

### Requirement: GitHub Organization Policy Is A Filter Only

The system MUST treat the workspace GitHub organization allow-list as a GiTiempo visibility policy layered on top of each user's connected GitHub account permissions. The policy MUST gate new organization-backed GitHub browsing and task-picker suggestion flows without granting provider access by itself.

#### Scenario: Allowed organization does not grant provider access

- **GIVEN** a GitHub organization login is allowed for the workspace
- **AND** a workspace member's connected GitHub account cannot access that organization
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system does not grant access through the workspace policy
- **AND** the response reflects the member's provider access failure or empty provider result safely

#### Scenario: Disallowed organization remains hidden

- **GIVEN** a workspace member's connected GitHub account can access a GitHub organization
- **AND** that organization is not allowed by the workspace policy
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system rejects the organization-scoped request or omits that organization from selectable results

#### Scenario: Disallowed organization remains unavailable for issue suggestions

- **GIVEN** a workspace member opens a GitHub-backed local project whose repository owner is a GitHub organization
- **AND** that organization is not allowed by the workspace policy
- **WHEN** the member opens a task-picker flow that can show GitHub issue suggestions
- **THEN** the organization is not treated as a browseable issue source
- **AND** the missing organization policy does not remove existing local GiTiempo tasks from the picker

#### Scenario: Empty organization policy leaves local task-picker behavior available

- **GIVEN** a workspace has no allowed GitHub organization policy records
- **AND** the workspace contains local GiTiempo projects and tasks
- **WHEN** a member opens the top-bar timer task picker
- **THEN** organization-owned GitHub issue suggestions are unavailable
- **AND** local project, task, and new-task selection remains available according to the member's GiTiempo visibility

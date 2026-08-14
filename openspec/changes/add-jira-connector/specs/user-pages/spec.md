## ADDED Requirements

### Requirement: Top-Bar Timer Picker Offers Jira Projects

The user-web top-bar timer picker SHALL offer the approved site's Jira projects as timer targets for a connected member, grouped separately from GiTiempo projects and GitHub boards, with connection and policy absences explained in place.

#### Scenario: Jira group renders in the picker

- **GIVEN** a connected member in a workspace with an approved Jira site
- **WHEN** they open the top-bar timer task picker
- **THEN** a Jira group lists the projects their account can read
- **AND** selecting one lists its open issues as task options

#### Scenario: Missing connection or site is explained

- **GIVEN** the member lacks an Atlassian connection, or the workspace lacks an approved site
- **WHEN** they open the picker
- **THEN** the Jira group states which is missing and how to resolve it
- **AND** the GiTiempo and GitHub sections behave as before

### Requirement: Profile Shows The Jira Connection

The user-web profile page SHALL show the member's Jira connection state beside the GitHub connection card, offering connect, reconnect when re-authorization is needed, and disconnect.

#### Scenario: Profile renders the Jira card

- **WHEN** a member opens their profile
- **THEN** a Jira connection card shows not connected, connected with the Atlassian identity, or re-authorization required
- **AND** the matching action is offered for each state

## ADDED Requirements

### Requirement: Top-Bar Timer Picker Offers Organization GitHub Projects

The user-web top-bar timer task picker SHALL offer the organization's GitHub Project boards as targets beside visible projects, so a member can start tracking an issue that is already planned on a board. Board targets MUST be presented as their own kind and MUST NOT be mixed into the picker's project state. Everything the picker already does for real projects and their tasks MUST behave exactly as before.

#### Scenario: Board targets appear beside projects

- **GIVEN** the top-bar timer task picker is open for a member whose workspace approves an organization
- **WHEN** the picker lists its selectable targets
- **THEN** the member's visible projects appear as they do today
- **AND** that organization's open GitHub Project boards appear as a separate labelled group

#### Scenario: Selecting a project is unchanged

- **GIVEN** board targets are present in the picker
- **WHEN** the member selects a visible project
- **THEN** the picker loads that project's tasks exactly as it does without board targets
- **AND** unsynced GitHub issues are still appended for a GitHub-backed project

#### Scenario: Selecting a board lists its issues instead of project tasks

- **GIVEN** the picker is open
- **WHEN** the member selects a board target and then one of its open issues
- **THEN** the dialog allows starting a timer for that issue
- **AND** starting it produces a running timer against a task in a project that tracks that issue's repository

#### Scenario: Picker states for boards stay distinct

- **WHEN** board loading, a board with no trackable issues, a missing GitHub connection, or a request failure occurs
- **THEN** the picker renders a state specific to that condition
- **AND** it does not collapse a failure into empty-data messaging

The detailed behaviour of board targets — which boards are offered, issue listing, draft reporting, and the guards that keep a board out of project-only code paths — is specified by the `timer-github-project-tracking` capability.

## ADDED Requirements

### Requirement: Add Project Supports GitHub-Backed Candidate Selection
The admin Add Project page SHALL allow connected GitHub users to create a local project from a selected GitHub repository or GitHub Project V2 candidate while preserving the existing manual project creation path.

#### Scenario: Connected admin sees GitHub project candidate controls
- **GIVEN** an admin or PM has an active GitHub connection
- **WHEN** they open the Add Project page
- **THEN** the page SHALL expose GitHub-backed project candidate controls for repositories and Project V2 projects
- **AND** the page SHALL keep a manual project entry path available
- **AND** no local project SHALL be created until the user submits the Add Project form

#### Scenario: GitHub candidate selection populates local project fields
- **GIVEN** GitHub project candidates have loaded
- **WHEN** the user selects a repository or Project V2 candidate
- **THEN** the Add Project form SHALL populate the local project name from the selected candidate
- **AND** the form SHALL retain an editable local project name before submission
- **AND** the form SHALL display that the pending project source is GitHub-backed

#### Scenario: Manual fallback clears GitHub metadata
- **GIVEN** the Add Project form has a selected GitHub candidate
- **WHEN** the user clears the candidate selection or switches to manual entry
- **THEN** the form SHALL remove pending GitHub provider-reference metadata from the create request
- **AND** submitting valid manual fields SHALL create a manual local project

#### Scenario: Disconnected users retain manual project creation
- **GIVEN** the user has no active GitHub connection
- **WHEN** they open the Add Project page
- **THEN** the page SHALL keep manual project creation available
- **AND** the page SHALL NOT require GitHub candidate loading before the user can submit a manual project

#### Scenario: GitHub candidate loading failures are retryable
- **WHEN** GitHub owner, repository, or Project V2 candidate loading fails on the Add Project page
- **THEN** the page SHALL surface a request-error state for the GitHub candidate controls
- **AND** the page SHALL keep manual project entry available
- **AND** the user SHALL be able to retry GitHub candidate loading without leaving the page

#### Scenario: Creating from a GitHub candidate sends source metadata
- **GIVEN** the Add Project form has a selected GitHub candidate
- **WHEN** the user submits valid project fields
- **THEN** the project create request SHALL include validated GitHub provider-reference metadata for the selected repository or Project V2 project
- **AND** the page SHALL treat the create response as authoritative for the rendered project source after navigation or refresh

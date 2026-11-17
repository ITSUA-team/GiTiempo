## ADDED Requirements

### Requirement: Project creation choices follow the active workspace
The Add Project form SHALL invalidate workspace-owned selections on a successful workspace switch and SHALL offer only the new workspace's eligible managers and GitHub import choices.

#### Scenario: Switch with a project manager selected
- **GIVEN** an admin in A has selected a project manager in the Add Project form
- **WHEN** the admin successfully switches to B and retains access to the form
- **THEN** the old manager selection clears and the form automatically loads B's eligible managers
- **AND** submitting in B cannot send A's selected manager ID

#### Scenario: Switch while a GitHub board is selected or being scanned
- **GIVEN** GitHub import is open in A and a board is selected or a repository scan is pending
- **WHEN** the admin successfully switches to B and retains access to Add Project
- **THEN** GitHub import stays open and clears A's organization, board, repository summary and import eligibility
- **AND** the form resolves B's connection, organizations, boards and already-imported projects and repositories before offering a valid import
- **AND** an outstanding response from A cannot select a board or enable an import in B

#### Scenario: Destination has no GitHub connection
- **GIVEN** the GitHub import form in A shows available boards
- **WHEN** the admin switches to B where GitHub import is unavailable
- **THEN** the form shows B's unavailable state and cannot submit an import from A

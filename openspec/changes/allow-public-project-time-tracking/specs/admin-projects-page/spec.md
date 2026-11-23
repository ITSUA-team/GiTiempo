## MODIFIED Requirements

### Requirement: Admin Can Inline-Edit Project Via Row Expansion

The admin Projects page MUST provide an inline editor for project settings. The editor MUST show the Select members dropdown only when its current visibility selection is Private. The same rule applies to desktop rows and mobile cards. Project manager selection is a separate setting.

#### Scenario: Open a public project with existing assignments

- **GIVEN** a public project already has assigned members
- **WHEN** the admin expands its settings
- **THEN** Select members is absent from both the visible form and keyboard navigation
- **AND** the admin can edit the project manager and other available settings
- **AND** saving unrelated settings preserves every existing assignment

#### Scenario: Edit form saves project changes

- **GIVEN** the admin opens a private project's settings
- **WHEN** the editor expands
- **THEN** it shows the current visibility and preselects the assigned members
- **AND** saving member changes applies the additions and removals explicitly selected by the admin

#### Scenario: Switch from private to public in the editor

- **GIVEN** the admin has edited the selected members of a private project
- **WHEN** the admin selects Public before saving
- **THEN** the member dropdown disappears immediately
- **AND** saving persists public visibility without applying pending changes from that dropdown
- **AND** cancelling leaves persisted visibility and assignments intact

#### Scenario: Switch from public to private in the editor

- **GIVEN** the admin opens settings for a public project
- **WHEN** the admin selects Private
- **THEN** Select members appears immediately with the existing assignments preselected
- **AND** the admin may review or change the list before saving
- **AND** saving applies private visibility and the selected assignment changes

#### Scenario: Projects expansion form emits save payload

- **GIVEN** the admin submits valid project settings
- **WHEN** the form emits the typed save intent
- **THEN** the page or its composable performs authorization checks, updates visibility via PATCH /projects/:id and applies the requested settings
- **AND** it refreshes rows and summary stats and collapses the editor on success, and shows actionable feedback on error
- **AND** the form delegates API calls, authentication, confirmations and notifications to the page

# Add Project PM Assignment Specification

## Purpose

Define the behavior of PM selection and assignment during project creation on the admin Add Project page.

## Requirements

### Requirement: PM Selector Shows Only PM-Role Members

The Project manager field MUST be a dropdown populated exclusively with workspace members whose `role` is `"pm"`.

#### Scenario: PM dropdown shows pm-role members only

- **WHEN** the Add Project form renders
- **THEN** the Project manager dropdown options contain only members with `role === "pm"`
- **AND** admin-role and member-role users do not appear in the list

#### Scenario: No PMs available

- **WHEN** no workspace members have `role === "pm"`
- **THEN** the dropdown shows an empty-state message ("No PMs available")
- **AND** the form can still be submitted without a PM selected

### Requirement: PM Selection Is Optional

The Project manager field MUST NOT be required. The form SHALL allow project creation without selecting a PM.

#### Scenario: Create project without PM

- **WHEN** the user submits the form without selecting a PM
- **THEN** the project is created successfully
- **AND** no assignment API call is made

### Requirement: Selected PM Is Assigned After Project Creation

When a PM is selected and the project is created successfully, the system MUST assign the selected PM to the new project.

#### Scenario: PM assigned after creation

- **WHEN** the user selects a PM and submits the form
- **THEN** the project is created via `POST /projects`
- **AND** the selected PM is assigned via `POST /projects/:id/assignments`
- **AND** the user is navigated to the projects list

#### Scenario: Assignment fails but project was created

- **WHEN** project creation succeeds but the assignment call fails
- **THEN** a warning toast is shown describing the partial failure
- **AND** the user is still navigated to the projects list (project exists)

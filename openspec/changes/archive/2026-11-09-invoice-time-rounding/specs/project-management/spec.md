# Spec Delta

## ADDED Requirements

### Requirement: Project Time Rounding Step Is Editable Billing Metadata

The system MUST allow permitted project editors to persist an optional `timeRoundingStepMinutes` value on a project that controls the default per-entry rounding step for invoices scoped to that project. The value MUST be a positive integer between 1 and 60, or null to inherit the workspace's `timeRoundingStepMinutes`; there is no no-rounding state because rounding is always active. The value MUST NOT affect existing invoices or time entries.

#### Scenario: Project is created with explicit rounding step

- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project with `timeRoundingStepMinutes: 5`
- **THEN** the system stores that value on the project
- **AND** subsequent project reads return the stored value

#### Scenario: Project is created without explicit rounding step

- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project without `timeRoundingStepMinutes`
- **THEN** the system stores `timeRoundingStepMinutes: null`
- **AND** subsequent project reads return `null`
- **AND** the project's effective rounding step is the workspace's `timeRoundingStepMinutes`

#### Scenario: Project rounding step is updated

- **GIVEN** the requester has permission to update a project
- **AND** the project has `timeRoundingStepMinutes: 5`
- **WHEN** the requester updates the project with `timeRoundingStepMinutes: 15`
- **THEN** the system stores the new value
- **AND** subsequent project reads return `15`

#### Scenario: Clearing the rounding step restores inheritance

- **GIVEN** the requester has permission to update a project
- **AND** the project has `timeRoundingStepMinutes: 5`
- **WHEN** the requester updates the project with `timeRoundingStepMinutes: null`
- **THEN** the system clears the stored value
- **AND** subsequent project reads return `null`
- **AND** the project's effective rounding step becomes the workspace's `timeRoundingStepMinutes`

#### Scenario: Project inherits the workspace default when null

- **GIVEN** a project whose `timeRoundingStepMinutes` is null
- **AND** the workspace's `timeRoundingStepMinutes` is 5
- **WHEN** the project's effective rounding step is resolved for future invoice creation
- **THEN** the resolved step is 5
- **AND** the project row itself continues to store null

#### Scenario: Changing the workspace default affects projects that inherit

- **GIVEN** a project whose `timeRoundingStepMinutes` is null
- **AND** the workspace's `timeRoundingStepMinutes` is 5
- **WHEN** the workspace's `timeRoundingStepMinutes` is changed to 15
- **THEN** the project's effective rounding step becomes 15 without any project update
- **AND** the project row itself continues to store null

#### Scenario: Invalid rounding step is rejected on create

- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project with `timeRoundingStepMinutes: 0`, a non-integer, or a value greater than 60
- **THEN** the system rejects the request

#### Scenario: Invalid rounding step is rejected on update

- **GIVEN** the requester has permission to update a project
- **WHEN** the requester updates the project with `timeRoundingStepMinutes: 0`, a non-integer, or a value greater than 60
- **THEN** the system rejects the request

#### Scenario: Rounding step does not affect existing invoices

- **GIVEN** an invoice was created with a `roundingStepMinutes` snapshot of 5
- **AND** the project's `timeRoundingStepMinutes` is later changed to 15
- **WHEN** the existing invoice is read
- **THEN** the invoice's `roundingStepMinutes` remains 5
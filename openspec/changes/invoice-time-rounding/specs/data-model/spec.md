# Spec Delta

## ADDED Requirements

### Requirement: Project Time Rounding Step Is Stored

The backend data model MUST persist an optional `time_rounding_step_minutes` column on project records that controls the default per-entry rounding step for invoices scoped to that project.

#### Scenario: Project row stores rounding step

- **GIVEN** a project row is stored
- **WHEN** the row is represented in the core data model
- **THEN** the row includes a nullable integer `time_rounding_step_minutes` column
- **AND** the column accepts positive integers from 1 to 60 or null

#### Scenario: New project defaults to null rounding step

- **GIVEN** a project is created without an explicit `timeRoundingStepMinutes`
- **WHEN** the backend stores the project row
- **THEN** `time_rounding_step_minutes` is null

#### Scenario: Existing projects are backfilled with null rounding step

- **GIVEN** existing project rows predate the `time_rounding_step_minutes` column
- **WHEN** the rounding-step migration is applied
- **THEN** existing project rows receive `time_rounding_step_minutes: null`

#### Scenario: Rounding step is constrained to valid range

- **GIVEN** a project row is stored
- **WHEN** the backend records the `time_rounding_step_minutes` value
- **THEN** the value is either null or an integer between 1 and 60 inclusive

## MODIFIED Requirements

### Requirement: Invoice Records Are Stored

The backend data model MUST persist workspace-owned invoice records with a title, status, billing date range, snapshot hourly rate, snapshot currency, optional discount, snapshot total hours, snapshot total amount, optional snapshot rounding step, optional notes, the creating user, and timestamps.

#### Scenario: Invoice row stores snapshot fields

- **GIVEN** an invoice is created from a set of time entries
- **WHEN** the backend persists the invoice row
- **THEN** the row stores `workspace_id`, optional `project_id`, `title`, `status`, `date_from`, `date_to`, `hourly_rate`, `currency`, `discount_percent`, `total_hours`, `total_amount`, `rounding_step_minutes`, `notes`, `created_by`, and timestamps
- **AND** `status` is one of `draft`, `sent`, or `paid`
- **AND** `rounding_step_minutes` is either null or an integer between 1 and 60 inclusive

#### Scenario: Invoice status is constrained

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice status
- **THEN** the status is one of `draft`, `sent`, or `paid`

#### Scenario: Invoice is workspace-scoped

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice
- **THEN** the row references a non-null `workspace_id`
- **AND** the workspace owns the invoice

#### Scenario: Existing invoices are backfilled with null rounding step

- **GIVEN** existing invoice rows predate the `rounding_step_minutes` column
- **WHEN** the rounding-step migration is applied
- **THEN** existing invoice rows receive `rounding_step_minutes: null`
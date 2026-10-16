# Spec Delta

## ADDED Requirements

### Requirement: Invoice Records Are Stored

The backend data model MUST persist workspace-owned invoice records with a title, status, billing date range, snapshot hourly rate, snapshot currency, optional discount, snapshot total hours, snapshot total amount, optional notes, the creating user, and timestamps.

#### Scenario: Invoice row stores snapshot fields

- **GIVEN** an invoice is created from a set of time entries
- **WHEN** the backend persists the invoice row
- **THEN** the row stores `workspace_id`, optional `project_id`, `title`, `status`, `date_from`, `date_to`, `hourly_rate`, `currency`, `discount_percent`, `total_hours`, `total_amount`, `notes`, `created_by`, and timestamps
- **AND** `status` is one of `draft`, `sent`, or `paid`

#### Scenario: Invoice status is constrained

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice status
- **THEN** the status is one of `draft`, `sent`, or `paid`

#### Scenario: Invoice is workspace-scoped

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice
- **THEN** the row references a non-null `workspace_id`
- **AND** the workspace owns the invoice

### Requirement: Time Entry Invoice Linkage Is Single

The backend data model MUST link a time entry to an invoice through a nullable foreign key on the time entry row, and MUST ensure a completed time entry is linked to at most one invoice.

#### Scenario: Time entry carries an optional invoice link

- **GIVEN** a time entry is not yet billed
- **WHEN** the backend stores the entry
- **THEN** the row has a nullable invoice link that is initially null

#### Scenario: Linking an entry sets the foreign key

- **GIVEN** a time entry is selected for an invoice
- **WHEN** the backend associates the entry with the invoice
- **THEN** the row's invoice link references that invoice

#### Scenario: An entry cannot be linked to two invoices

- **GIVEN** a time entry is already linked to one invoice
- **WHEN** another invoice attempts to link the same entry
- **THEN** the data model prevents the second link so the entry is billed at most once

#### Scenario: Deleting an invoice clears the link

- **GIVEN** an invoice is linked to time entries
- **WHEN** the invoice is deleted
- **THEN** the linked time entries have their invoice link cleared (SET NULL) rather than being deleted
- **AND** those entries become eligible for a later invoice

## MODIFIED Requirements

### Requirement: Time Entry Records Are Stored
The backend data model MUST store task-linked time entries as workspace-owned records associated with the user who tracked the time.

#### Scenario: Completed time entry is stored
- **GIVEN** a completed time entry is created
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores start time, end time, duration seconds, description, billable state, source, and timestamps

#### Scenario: Running time entry is stored
- **GIVEN** a timer is started
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores the start time
- **AND** leaves end time and duration empty while the timer is running

#### Scenario: Time entry source is constrained
- **GIVEN** a time entry is stored
- **WHEN** the backend records the entry source
- **THEN** the source is one of `web`, `extension`, or `manual`

#### Scenario: Invoice linkage is optional and single
- **GIVEN** a time entry is stored
- **WHEN** the backend records the entry
- **THEN** the row carries an optional invoice link that is null until the entry is billed
- **AND** the link references at most one invoice
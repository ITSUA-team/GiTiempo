# Spec Delta

## ADDED Requirements

### Requirement: Shared Invoice Status Contract

The shared contracts SHALL define an invoice status enum restricted to `draft`, `sent`, and `paid` for backend validation and frontend consumption.

#### Scenario: Status value is validated

- **GIVEN** a request or response carries an invoice status
- **WHEN** the shared schema validates the value
- **THEN** only `draft`, `sent`, or `paid` are accepted and any other value is rejected

### Requirement: Shared Invoice Create Contract

The shared contracts SHALL define a validated invoice create request body with a title, billing date range, optional project id, hourly rate, optional currency, optional discount percent, and optional notes, rejecting any property outside the contract.

#### Scenario: Create request uses shared schema

- **GIVEN** an admin or PM creates an invoice
- **WHEN** the request body is validated
- **THEN** the title, date range, and rate requirements are enforced
- **AND** the discount percent is constrained to the 0–100 range

#### Scenario: Unknown property is rejected

- **GIVEN** a create request carries a property outside the contract
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice Update Contract

The shared contracts SHALL define a validated invoice update request body for editable fields, rejecting any property outside the contract and any attempt to mutate snapshot totals directly.

#### Scenario: Update request uses shared schema

- **GIVEN** an admin or PM updates an invoice
- **WHEN** the request body is validated
- **THEN** only editable fields defined by the contract are accepted

#### Scenario: Snapshot totals are not directly mutable

- **GIVEN** an update request attempts to set `total_hours` or `total_amount`
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice List Query Contract

The shared contracts SHALL define a validated invoice list query with pagination and optional filters by project, status, date range, and search text, rejecting any property outside the contract.

#### Scenario: List query uses shared schema

- **GIVEN** an admin or PM lists invoices
- **WHEN** the query parameters are validated
- **THEN** pagination (page, limit), project, status, date range, and search filters are enforced
- **AND** the search text is constrained to a maximum of 200 characters

#### Scenario: Unknown query property is rejected

- **GIVEN** a list query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

### Requirement: Shared Invoice Response Contract

The shared contracts SHALL define stable invoice list and detail response shapes that include snapshot fields, status, billing date range, optional project summary, and the count of linked time entries. The detail response additionally includes the full array of linked time-entry summaries.

#### Scenario: Invoice list response uses shared schema

- **GIVEN** the backend returns a list of invoices
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice list response contract
- **AND** includes pagination metadata
- **AND** each item includes snapshot fields, status, billing date range, optional project summary, and `timeEntryCount`
- **AND** list items do NOT include the `timeEntries` array

#### Scenario: Invoice detail response uses shared schema

- **GIVEN** the backend returns a single invoice
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice detail response contract
- **AND** includes snapshot `hourlyRate`, `currency`, `totalHours`, and `totalAmount`
- **AND** includes the linked time entries as an array of summaries

## MODIFIED Requirements

### Requirement: Shared Time Entry Response Contract

The shared time-entry response contract SHALL expose the invoice link of a time entry so clients can surface billed state without a separate request.

#### Scenario: Billed time entry exposes its invoice link

- **GIVEN** a time entry is linked to an invoice
- **WHEN** the backend returns that time entry
- **THEN** the response includes the invoice identifier as a UUID

#### Scenario: Unbilled time entry exposes a null invoice link

- **GIVEN** a time entry is not linked to any invoice
- **WHEN** the backend returns that time entry
- **THEN** the response includes a null invoice link
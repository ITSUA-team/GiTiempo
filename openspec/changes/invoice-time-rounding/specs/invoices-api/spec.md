# Spec Delta

## MODIFIED Requirements

### Requirement: Invoice Can Be Created From Eligible Time Entries

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, optional notes, and an optional `roundingStepMinutes`. When `roundingStepMinutes` is supplied it MUST be a positive integer between 1 and 60; when omitted and the invoice is scoped to a project with a configured `timeRoundingStepMinutes`, the backend MUST use the project's value as the snapshot rounding step; when omitted and no project default is available (or the project default is null), the snapshot rounding step MUST be null, meaning no per-entry rounding is applied.

#### Scenario: Admin creates an invoice across a project and date range

- **WHEN** an admin submits a valid create body scoped to a project and date range
- **THEN** the backend selects completed, billable time entries in that workspace, project, and date range that are not already linked to an invoice
- **AND** creates the invoice with snapshot totals computed from the selected entries
- **AND** links each selected entry to the invoice
- **AND** returns the created invoice with its details

#### Scenario: PM creates an invoice for an assigned project

- **WHEN** a PM submits a create body scoped to a project they are assigned to
- **THEN** the backend creates the invoice under the same eligibility rules

#### Scenario: PM cannot create an invoice for an unassigned private project

- **WHEN** a PM submits a create body scoped to a private project they are not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot create a workspace-wide invoice

- **WHEN** a PM submits a create body without a `projectId`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: Admin creates a workspace-wide invoice without a project

- **WHEN** an admin submits a valid create body without a `projectId`
- **THEN** the backend selects completed, billable, not-yet-invoiced time entries across the entire workspace within the date range
- **AND** creates the invoice with `projectId` set to null
- **AND** links each selected entry to the invoice
- **AND** returns the created invoice with its details

#### Scenario: Missing rate falls back to workspace settings

- **GIVEN** the create body omits the hourly rate
- **WHEN** the workspace settings define a default hourly rate
- **THEN** the backend uses that default rate as the snapshot rate
- **WHEN** no default rate is configured and no rate is supplied
- **THEN** the backend rejects with a validation error

#### Scenario: Missing currency falls back to workspace settings

- **GIVEN** the create body omits the currency
- **WHEN** the workspace settings define a default currency
- **THEN** the backend uses that default currency as the snapshot currency
- **WHEN** no default currency is configured and no currency is supplied
- **THEN** the backend rejects with a validation error

#### Scenario: Discount with more than two decimal places is rejected

- **GIVEN** a create request carries a `discountPercent` with more than 2 decimal places
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

#### Scenario: Rounding step defaults from project when omitted

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the invoice is scoped to a project whose `timeRoundingStepMinutes` is set to 5
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 5

#### Scenario: Rounding step defaults to null when project has none

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the invoice is scoped to a project whose `timeRoundingStepMinutes` is null
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is null

#### Scenario: Rounding step defaults to null for workspace-wide invoices

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the create body has no `projectId`
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is null

#### Scenario: Explicit rounding step overrides project default

- **GIVEN** the create body carries `roundingStepMinutes: 15`
- **AND** the invoice is scoped to a project whose `timeRoundingStepMinutes` is 5
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 15
- **AND** the project's `timeRoundingStepMinutes` is not changed

#### Scenario: Invalid rounding step is rejected

- **GIVEN** a create request carries `roundingStepMinutes` with a value of 0, a non-integer, or a value greater than 60
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Invoice Totals Use Snapshot Values

The backend MUST compute invoice totals as the sum of tracked hours of selected entries multiplied by the invoice hourly rate, less the optional percentage discount, and MUST store `hourly_rate`, `currency`, `total_hours`, `total_amount`, and `rounding_step_minutes` as snapshot values at creation time. When `rounding_step_minutes` is a positive integer, the backend MUST round each eligible time entry's duration up to the nearest multiple of the step (in seconds) before summing; when `rounding_step_minutes` is null, the backend MUST sum raw entry durations as before. Original time-entry records MUST NOT be modified by the rounding computation.

#### Scenario: Totals reflect the creation snapshot

- **GIVEN** an invoice is created with a given hourly rate, currency, and discount
- **WHEN** the backend computes and stores totals
- **THEN** the stored `total_amount` equals `total_hours * hourly_rate * (1 - discount_percent / 100)`
- **AND** the stored rate, currency, totals, and rounding step do not change when the workspace default rate or currency or the project rounding step changes later

#### Scenario: Later time-entry edits do not recalculate totals

- **GIVEN** an invoice exists with snapshot totals
- **WHEN** a linked time entry is edited after invoice creation
- **THEN** the invoice `total_hours` and `total_amount` remain as originally captured

#### Scenario: Totals are rounded correctly at half-cent boundaries

- **GIVEN** an invoice is created with 0.5 tracked hours at a rate of $75.21
- **WHEN** the backend computes the total amount
- **THEN** the stored `total_amount` is $37.61 (rounded up from 37.605)
- **AND** the computation uses integer fixed-point arithmetic to avoid floating-point drift

#### Scenario: Hours rounding avoids floating-point drift from seconds conversion

- **GIVEN** an invoice is created with 522 tracked seconds at a rate of $100
- **WHEN** the backend converts seconds to centihours
- **THEN** the result is 15 centihours (0.15 hours), not 14 (0.14 hours)
- **AND** the stored `total_amount` is $15.00
- **AND** the conversion multiplies seconds by 100 before dividing by 3600 to keep the intermediate as an exact integer

#### Scenario: Per-entry rounding is applied before summing

- **GIVEN** an invoice is created with `roundingStepMinutes: 5`
- **AND** two eligible time entries have durations of 60 seconds and 90 seconds
- **WHEN** the backend computes the total tracked seconds
- **THEN** each entry is rounded up to 300 seconds (the 5-minute multiple)
- **AND** the summed total is 600 seconds (10 minutes)
- **AND** the original time-entry `duration_seconds` values remain 60 and 90

#### Scenario: Entry already at a step multiple is not further rounded

- **GIVEN** an invoice is created with `roundingStepMinutes: 5`
- **AND** an eligible time entry has a duration of exactly 300 seconds
- **WHEN** the backend applies per-entry rounding
- **THEN** that entry's rounded duration remains 300 seconds

#### Scenario: Null rounding step preserves raw-sum behavior

- **GIVEN** an invoice is created with `roundingStepMinutes: null`
- **AND** two eligible time entries have durations of 60 seconds and 90 seconds
- **WHEN** the backend computes the total tracked seconds
- **THEN** the summed total is 150 seconds
- **AND** no per-entry rounding is applied

#### Scenario: Computed total exceeding the storage limit is rejected

- **GIVEN** the computed `total_amount` exceeds the maximum value storable in `NUMERIC(12,2)`
- **WHEN** the backend attempts to create the invoice
- **THEN** the backend rejects with `422 Unprocessable Entity`
- **AND** no invoice row is persisted

### Requirement: Invoice Details Can Be Read

The backend MUST expose a protected `GET /invoices/:id` endpoint for `admin` and `pm` users that returns a single invoice with its snapshot fields (including `roundingStepMinutes`), status, and the set of linked time entries.

#### Scenario: Admin reads any workspace invoice

- **WHEN** an admin requests `GET /invoices/:id` for an invoice in their workspace
- **THEN** the backend returns the invoice detail including snapshot totals, `roundingStepMinutes`, and linked entries

#### Scenario: PM cannot read an unassigned private-project invoice

- **WHEN** a PM requests `GET /invoices/:id` for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot read a workspace-wide invoice

- **WHEN** a PM requests `GET /invoices/:id` for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: Cross-workspace invoice is not found

- **WHEN** a user requests `GET /invoices/:id` for an invoice in another workspace
- **THEN** the backend rejects with `404 Not Found`

### Requirement: Invoice Can Be Updated

The backend MUST expose a protected `PATCH /invoices/:id` endpoint for `admin` and `pm` users that updates editable fields — status, notes, and other fields allowed by the shared update contract — without recalculating snapshot totals, changing the `roundingStepMinutes` snapshot, or changing the linked time-entry set.

The `sent` status is a semantic marker: the backend does not send an email, generate a PDF, or notify external systems when an invoice transitions to `sent`. Email delivery and PDF generation are deferred to a future milestone. The UI labels this action "Mark as sent" to make the manual nature of the transition clear.

#### Scenario: Admin updates invoice status

- **WHEN** an admin submits a valid update changing the status from `draft` to `sent`
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: PM updates status for an assigned project

- **WHEN** a PM submits a valid update changing the status from `draft` to `sent` for an invoice scoped to a project they are assigned to
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: Status transition from sent to paid

- **GIVEN** an invoice with status `sent`
- **WHEN** an admin or PM submits an update changing the status to `paid`
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: Status transitions are one-way and irreversible

- **GIVEN** an invoice with status `sent`
- **WHEN** a user attempts to change the status back to `draft`
- **THEN** the backend rejects with `409 Conflict`
- **AND** the invoice status remains `sent`

- **GIVEN** an invoice with status `paid`
- **WHEN** a user attempts to change the status back to `draft` or `sent`
- **THEN** the backend rejects with `409 Conflict`
- **AND** the invoice status remains `paid`

The allowed forward transitions are: `draft → sent`, `draft → paid`, and `sent → paid`. Once an invoice reaches `sent` or `paid`, it cannot return to `draft`, which prevents the re-billing bypass where a paid invoice could be reverted to `draft`, deleted, and re-created for the same time entries.

#### Scenario: Update does not recompute totals

- **GIVEN** an invoice was created with snapshot totals and a `roundingStepMinutes` of 5
- **WHEN** an update request changes a non-total field
- **THEN** the stored `total_hours`, `total_amount`, and `roundingStepMinutes` remain as originally captured

#### Scenario: PM updates only assigned-project invoices

- **WHEN** a PM submits an update for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot update a workspace-wide invoice

- **WHEN** a PM submits an update for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

### Requirement: Eligible Time Entries Can Be Previewed Before Invoice Creation

The backend MUST expose a protected `GET /invoices/eligible-entries` endpoint for `admin` and `pm` users that returns the set of completed, billable, not-yet-invoiced time entries matching a given date range and optional project scope, along with the computed total hours — without creating an invoice or modifying any data. The endpoint MUST accept an optional `roundingStepMinutes` query parameter; when supplied, the computed total hours MUST reflect per-entry ceiling rounding using that step. When `roundingStepMinutes` is omitted, the endpoint MUST return the scoped project's `timeRoundingStepMinutes` as `defaultRoundingStepMinutes` so the UI can pre-fill the field, and the total hours MUST use that project default if it is non-null. The response MUST include `defaultRoundingStepMinutes` (nullable) alongside the existing `defaultHourlyRate` and `defaultCurrency`.

#### Scenario: Admin previews eligible entries across a date range

- **WHEN** an admin requests `GET /invoices/eligible-entries?dateFrom=2026-04-01&dateTo=2026-04-21` with the workspace JWT claim
- **THEN** the backend returns all completed, billable, not-yet-invoiced time entries in that workspace and date range
- **AND** includes the total count and total hours computed from the selected entries
- **AND** does not create an invoice or link any time entries

#### Scenario: Admin previews eligible entries scoped to a project

- **WHEN** an admin requests `GET /invoices/eligible-entries?dateFrom=2026-04-01&dateTo=2026-04-21&projectId=X`
- **THEN** the backend returns only entries whose task belongs to the specified project
- **AND** verifies the project belongs to the workspace

#### Scenario: PM must scope preview to an assigned project

- **WHEN** a PM requests `GET /invoices/eligible-entries` without a `projectId`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot preview entries for an unassigned private project

- **WHEN** a PM requests `GET /invoices/eligible-entries?projectId=X` for a private project they are not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: Member is denied

- **WHEN** an ordinary member requests `GET /invoices/eligible-entries`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: No eligible entries returns an empty result

- **WHEN** no time entries match the eligibility rules for the requested scope
- **THEN** the backend returns `{ count: 0, totalHours: 0, entries: [] }`

#### Scenario: Preview does not modify data

- **WHEN** a preview request is executed
- **THEN** no invoice row is created
- **AND** no time entry `invoice_id` is set
- **AND** no database transaction is started
- **AND** the response includes `userName` and `taskName` for each entry so the UI can display them without additional lookups

#### Scenario: dateTo before dateFrom is rejected

- **WHEN** a request carries `dateTo` earlier than `dateFrom`
- **THEN** the backend rejects with a validation error

#### Scenario: Preview returns project default rounding step

- **GIVEN** the preview is scoped to a project with `timeRoundingStepMinutes` set to 10
- **WHEN** the request omits `roundingStepMinutes`
- **THEN** the response includes `defaultRoundingStepMinutes: 10`
- **AND** the `totalHours` reflect per-entry rounding with a 10-minute step

#### Scenario: Preview applies explicit rounding step override

- **GIVEN** the preview is scoped to a project with `timeRoundingStepMinutes` set to 10
- **WHEN** the request carries `roundingStepMinutes=15`
- **THEN** the `totalHours` reflect per-entry rounding with a 15-minute step
- **AND** the response still includes `defaultRoundingStepMinutes: 10`

#### Scenario: Preview without project returns null default rounding step

- **GIVEN** an admin requests a workspace-wide preview without a `projectId`
- **WHEN** the request omits `roundingStepMinutes`
- **THEN** the response includes `defaultRoundingStepMinutes: null`
- **AND** the `totalHours` are computed without per-entry rounding
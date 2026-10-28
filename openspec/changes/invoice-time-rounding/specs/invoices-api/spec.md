# Spec Delta

## MODIFIED Requirements

### Requirement: Invoice Can Be Created From Eligible Time Entries

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, optional notes, and an optional `roundingStepMinutes` (positive integer between 1 and 60). Rounding is always active — there is no no-rounding option — so the invoice's `roundingStepMinutes` snapshot MUST always be a positive integer between 1 and 60 and MUST never be null. When `roundingStepMinutes` is supplied, the backend MUST use that value as the snapshot. When it is omitted, the backend MUST resolve the snapshot from the scoped project's effective rounding step — the project's own `timeRoundingStepMinutes` when set, otherwise the workspace's `timeRoundingStepMinutes` — and for workspace-wide invoices from the workspace's `timeRoundingStepMinutes`.

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

#### Scenario: Rounding step defaults from the project's effective step when omitted

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the invoice is scoped to a project whose `timeRoundingStepMinutes` is set to 5
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 5

#### Scenario: Rounding step defaults from the workspace setting when the project inherits

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the invoice is scoped to a project whose `timeRoundingStepMinutes` is null
- **AND** the workspace's `timeRoundingStepMinutes` is 15
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 15

#### Scenario: Rounding step defaults from the workspace setting for workspace-wide invoices

- **GIVEN** the create body omits `roundingStepMinutes`
- **AND** the create body has no `projectId`
- **AND** the workspace's `timeRoundingStepMinutes` is 10
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 10

#### Scenario: Explicit rounding step overrides the project default

- **GIVEN** the create body carries `roundingStepMinutes: 15`
- **AND** the invoice is scoped to a project whose effective rounding step is 5
- **WHEN** the backend creates the invoice
- **THEN** the stored `roundingStepMinutes` snapshot is 15
- **AND** the project's `timeRoundingStepMinutes` is not changed

#### Scenario: Invalid rounding step is rejected

- **GIVEN** a create request carries `roundingStepMinutes` with a value of 0, a non-integer, or a value greater than 60
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Invoice Totals Use Snapshot Values

The backend MUST compute invoice totals as the sum of tracked hours of selected entries multiplied by the invoice hourly rate, less the optional percentage discount, and MUST store `hourly_rate`, `currency`, `total_hours`, `total_amount`, and `rounding_step_minutes` as snapshot values at creation time. Because the snapshot rounding step is always a positive integer between 1 and 60, the backend MUST always apply per-entry ceiling rounding: each eligible time entry's duration is rounded up to the nearest multiple of the step (in seconds) before the rounded durations are summed. Per-entry rounding is always active — there is no raw-sum mode — and with the minimum step of 1 minute each entry is still rounded up to whole minutes. Original time-entry records MUST NOT be modified by the rounding computation.

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

#### Scenario: Minimum step still rounds each entry up to whole minutes

- **GIVEN** an invoice is created with `roundingStepMinutes: 1`
- **AND** two eligible time entries have durations of 60 seconds and 90 seconds
- **WHEN** the backend computes the total tracked seconds
- **THEN** the 60-second entry remains 60 seconds and the 90-second entry is rounded up to 120 seconds
- **AND** the summed total is 180 seconds (3 minutes)

#### Scenario: Computed total exceeding the storage limit is rejected

- **GIVEN** the computed `total_amount` exceeds the maximum value storable in `NUMERIC(12,2)`
- **WHEN** the backend attempts to create the invoice
- **THEN** the backend rejects with `422 Unprocessable Entity`
- **AND** no invoice row is persisted

### Requirement: Invoice Details Can Be Read

The backend MUST expose a protected `GET /invoices/:id` endpoint for `admin` and `pm` users that returns a single invoice with its snapshot fields (including the non-null `roundingStepMinutes` snapshot), status, and the set of linked time entries. Each linked time-entry summary MUST include both the original raw `durationSeconds` and a `roundedDurationSeconds` value computed by applying per-entry ceiling rounding with the invoice's `roundingStepMinutes` snapshot, so the detail surface can display the rounded billed duration per entry without recomputing it client-side.

#### Scenario: Admin reads any workspace invoice

- **WHEN** an admin requests `GET /invoices/:id` for an invoice in their workspace
- **THEN** the backend returns the invoice detail including snapshot totals, the non-null `roundingStepMinutes` snapshot, and linked entries
- **AND** each linked entry includes `durationSeconds` (raw) and `roundedDurationSeconds` (ceiling-rounded using the invoice snapshot step)

#### Scenario: Linked entry rounded duration reflects the invoice snapshot step

- **GIVEN** an invoice was created with `roundingStepMinutes: 5`
- **AND** a linked time entry has a raw `durationSeconds` of 360 (6 minutes)
- **WHEN** the backend returns the invoice detail
- **THEN** that entry's `roundedDurationSeconds` is 600 (10 minutes)
- **AND** that entry's `durationSeconds` remains 360

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

The backend MUST expose a protected `PATCH /invoices/:id` endpoint for `admin` and `pm` users that updates editable fields — status, notes, and other fields allowed by the shared update contract — without recalculating snapshot totals, changing the non-null `roundingStepMinutes` snapshot, or changing the linked time-entry set. The `roundingStepMinutes` snapshot is immutable after creation and cannot be changed by an update.

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

#### Scenario: Rounding step snapshot is not mutable via update

- **GIVEN** an invoice exists with a `roundingStepMinutes` snapshot of 5
- **WHEN** an update request carries `roundingStepMinutes: 15`
- **THEN** the backend rejects the request
- **AND** the stored `roundingStepMinutes` snapshot remains 5

#### Scenario: PM updates only assigned-project invoices

- **WHEN** a PM submits an update for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot update a workspace-wide invoice

- **WHEN** a PM submits an update for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

### Requirement: Eligible Time Entries Can Be Previewed Before Invoice Creation

The backend MUST expose a protected `GET /invoices/eligible-entries` endpoint for `admin` and `pm` users that returns the set of completed, billable, not-yet-invoiced time entries matching a given date range and optional project scope, along with the computed total hours — without creating an invoice or modifying any data. Rounding is always active: the endpoint MUST accept an optional `roundingStepMinutes` query parameter (positive integer between 1 and 60); when supplied, the computed total hours MUST reflect per-entry ceiling rounding using that step. When `roundingStepMinutes` is omitted, the total hours MUST reflect per-entry ceiling rounding with the effective default step: for project-scoped previews the project's `timeRoundingStepMinutes` when set, otherwise the workspace's `timeRoundingStepMinutes`; for workspace-wide previews the workspace's `timeRoundingStepMinutes`. The response MUST always include a non-null `defaultRoundingStepMinutes` — the effective default step — alongside the existing `defaultHourlyRate` and `defaultCurrency`. Each returned entry MUST include both the original raw `durationSeconds` and a `roundedDurationSeconds` value computed by applying per-entry ceiling rounding with the effective rounding step, so the preview surface can display the rounded billed duration per entry.

#### Scenario: Admin previews eligible entries across a date range

- **WHEN** an admin requests `GET /invoices/eligible-entries?dateFrom=2026-04-01&dateTo=2026-04-21` with the workspace JWT claim
- **THEN** the backend returns all completed, billable, not-yet-invoiced time entries in that workspace and date range
- **AND** includes the total count and total hours computed from the selected entries
- **AND** each entry includes `durationSeconds` (raw) and `roundedDurationSeconds` (ceiling-rounded with the effective step)
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
- **AND** the response still includes a non-null `defaultRoundingStepMinutes`

#### Scenario: Preview does not modify data

- **WHEN** a preview request is executed
- **THEN** no invoice row is created
- **AND** no time entry `invoice_id` is set
- **AND** no database transaction is started
- **AND** the response includes `userName` and `taskName` for each entry so the UI can display them without additional lookups

#### Scenario: dateTo before dateFrom is rejected

- **WHEN** a request carries `dateTo` earlier than `dateFrom`
- **THEN** the backend rejects with a validation error

#### Scenario: Preview returns the project's effective rounding step

- **GIVEN** the preview is scoped to a project with `timeRoundingStepMinutes` set to 10
- **WHEN** the request omits `roundingStepMinutes`
- **THEN** the response includes `defaultRoundingStepMinutes: 10`
- **AND** the `totalHours` reflect per-entry rounding with a 10-minute step

#### Scenario: Preview returns the workspace default when the project inherits

- **GIVEN** the preview is scoped to a project whose `timeRoundingStepMinutes` is null
- **AND** the workspace's `timeRoundingStepMinutes` is 5
- **WHEN** the request omits `roundingStepMinutes`
- **THEN** the response includes `defaultRoundingStepMinutes: 5`
- **AND** the `totalHours` reflect per-entry rounding with a 5-minute step

#### Scenario: Preview returns the workspace step for workspace-wide previews

- **GIVEN** an admin requests a workspace-wide preview without a `projectId`
- **AND** the workspace's `timeRoundingStepMinutes` is 10
- **WHEN** the request omits `roundingStepMinutes`
- **THEN** the response includes `defaultRoundingStepMinutes: 10`
- **AND** the `totalHours` reflect per-entry rounding with a 10-minute step

#### Scenario: Preview applies explicit rounding step override

- **GIVEN** the preview is scoped to a project with an effective rounding step of 10
- **WHEN** the request carries `roundingStepMinutes=15`
- **THEN** the `totalHours` reflect per-entry rounding with a 15-minute step
- **AND** each entry's `roundedDurationSeconds` is computed with a 15-minute step
- **AND** the response still includes `defaultRoundingStepMinutes: 10`
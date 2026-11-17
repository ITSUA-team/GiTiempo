# Invoices API Specification

## Purpose

Define protected invoice endpoints that let Admins and PMs bill completed workspace time entries, while guaranteeing each time entry is billed on at most one invoice and that invoice totals remain stable snapshots.

## Requirements

### Requirement: Invoices Can Be Listed By Admins And PMs

The backend MUST expose a protected `GET /invoices` endpoint for `admin` and `pm` users that lists invoices within the authenticated user's workspace, with shared pagination and optional filters by project, status, date range, and search text. PMs must also have `canViewInvoices = true` to access the endpoint.

#### Scenario: Admin lists all workspace invoices

- **WHEN** an admin requests `GET /invoices` with the workspace JWT claim
- **THEN** the backend returns every invoice in that workspace
- **AND** paginates the result with shared list metadata

#### Scenario: Member is denied

- **WHEN** an ordinary member requests `GET /invoices`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM lists only assigned-project invoices

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices` with the workspace JWT claim
- **THEN** the backend returns only invoices whose project is an active public project or a private project assigned to that PM
- **AND** omits invoices for private projects the PM is not assigned to

#### Scenario: PM does not see workspace-wide invoices

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices`
- **THEN** invoices with no project scope (workspace-wide invoices) are not included in the result

#### Scenario: Search filters invoices by title

- **GIVEN** the workspace contains invoices with titles "April Billing" and "March Retainer"
- **WHEN** an admin requests `GET /invoices?search=April`
- **THEN** only invoices whose `title` matches the search text (case-insensitive) are returned
- **AND** invoices whose title does not contain the search text are excluded

#### Scenario: Date range filter narrows results

- **GIVEN** the workspace contains invoices with `date_from` values spanning multiple months
- **WHEN** an admin requests `GET /invoices?dateFrom=2026-04-01&dateTo=2026-04-30`
- **THEN** only invoices whose `date_from` is on or after `2026-04-01` and whose `date_to` is on or before `2026-04-30` are returned

#### Scenario: Date range filter rejects reversed bounds

- **WHEN** a request carries `dateTo` earlier than `dateFrom`
- **THEN** the backend rejects with a validation error

#### Scenario: PM without invoice permission is denied listing

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices`
- **THEN** the system rejects the request as forbidden

### Requirement: Invoice Can Be Created From Eligible Time Entries

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, optional notes, and an optional `roundingStepMinutes` (positive integer between 1 and 60). Rounding is always active — there is no no-rounding option — so the invoice's `roundingStepMinutes` snapshot MUST always be a positive integer between 1 and 60 and MUST never be null. When `roundingStepMinutes` is supplied, the backend MUST use that value as the snapshot. When it is omitted, the backend MUST resolve the snapshot from the scoped project's effective rounding step — the project's own `timeRoundingStepMinutes` when set, otherwise the workspace's `timeRoundingStepMinutes` — and for workspace-wide invoices from the workspace's `timeRoundingStepMinutes`. PMs must also have `canViewInvoices = true` to access the endpoint.

#### Scenario: Admin creates an invoice across a project and date range

- **WHEN** an admin submits a valid create body scoped to a project and date range without specifying entry IDs
- **THEN** the backend selects completed, billable time entries in that workspace, project, and date range that are not already linked to an invoice
- **AND** creates the invoice with snapshot totals computed from the selected entries
- **AND** links each selected entry to the invoice
- **AND** returns the created invoice with its details

#### Scenario: PM creates an invoice for an assigned project

- **WHEN** a PM with `canViewInvoices = true` submits a create body scoped to a project they are assigned to
- **THEN** the backend creates the invoice under the same eligibility rules

#### Scenario: PM cannot create an invoice for an unassigned private project

- **WHEN** a PM with `canViewInvoices = true` submits a create body scoped to a private project they are not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot create a workspace-wide invoice

- **WHEN** a PM with `canViewInvoices = true` submits a create body without a `projectId`
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

#### Scenario: PM without invoice permission is denied creation

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `POST /invoices`
- **THEN** the system rejects the request as forbidden

#### Scenario: Select a subset or create an empty draft

- **GIVEN** several entries are eligible
- **WHEN** an authorized caller creates an invoice with an explicit selection
- **THEN** the API bills exactly those entries, including zero entries and zero totals for an empty selection, and assigns a new reference and draft status.

#### Scenario: Resolve invoice-specific business details

- **GIVEN** workspace invoice defaults exist
- **WHEN** the caller creates an invoice with individual overrides
- **THEN** the saved invoice contains the resolved sender, optional logo, payment details, recipient and service description; later default changes do not affect it.

### Requirement: Invoice Eligibility Excludes Ineligible Time Entries

Invoice creation MUST select only time entries that are completed, billable, belong to the requested workspace, and fall within the requested project and date range, and MUST exclude running, non-billable, and already-invoiced entries. Date range boundaries (`dateFrom` inclusive, `dateTo` inclusive) are interpreted in the workspace's configured IANA timezone (`workspace_settings.time_zone`), not in UTC or the server's local timezone. This ensures that entries near midnight are attributed to the correct calendar day, including across daylight saving time transitions. The same timezone-aware boundaries apply to `previewEligibleEntries` and the `getInvoiceStats` current-month calculation.

#### Scenario: Running entries are excluded

- **GIVEN** a time entry in the requested scope has a null end time
- **WHEN** invoice creation selects entries
- **THEN** that running entry is not included

#### Scenario: Non-billable entries are excluded

- **GIVEN** a completed time entry in the requested scope has `isBillable` set to false
- **WHEN** invoice creation selects entries
- **THEN** that entry is not included

#### Scenario: Already-invoiced entries are excluded

- **GIVEN** a completed billable entry in the requested scope is already linked to another invoice
- **WHEN** invoice creation selects entries
- **THEN** that entry is not included in the new invoice

#### Scenario: No eligible entries yields an empty invoice

- **WHEN** no time entries match the eligibility rules for the requested scope
- **THEN** the backend creates the invoice with zero total hours and zero total amount

#### Scenario: Date range boundaries use the workspace timezone

- **GIVEN** the workspace timezone is set to a non-UTC IANA identifier (e.g. `Europe/Kyiv`)
- **AND** a completed billable time entry started at 23:30 local time on the `dateFrom` day
- **WHEN** invoice creation selects entries for that date range
- **THEN** the entry is included because its local-time start falls within the billing period
- **AND** the backend interprets `dateFrom` as 00:00:00 in the workspace timezone and `dateTo` as 23:59:59.999 in the workspace timezone (exclusive next-day 00:00:00 boundary)

### Requirement: Invoice Creation Is Atomic And Prevents Duplicate Billing

Invoice creation MUST select eligible time entries, insert the invoice, and set `invoice_id` on the selected entries within a single database transaction, so concurrent invoice creation requests cannot link the same time entry to two invoices.

#### Scenario: Concurrent creation does not double-bill an entry

- **GIVEN** two invoice creation requests target the same eligible time entry at the same time
- **WHEN** both requests attempt to link the entry
- **THEN** exactly one request succeeds in linking the entry
- **AND** for legacy implicit selection the other request either excludes the entry because it is already linked or fails without creating a duplicate billing link

#### Scenario: Failed association rolls back the invoice

- **GIVEN** invoice creation inserts the invoice row but the entry-link update fails
- **WHEN** the transaction aborts
- **THEN** no invoice row remains and no time entry is linked to a partial invoice

#### Scenario: An explicit claim loses a race

- **GIVEN** two concurrent saves explicitly require the same available entry
- **WHEN** one transaction claims it first
- **THEN** the other fails atomically with a conflict and does not silently shorten its selection.

### Requirement: Invoice Details Can Be Read

The backend MUST expose a protected `GET /invoices/:id` endpoint for `admin` and `pm` users that returns a single invoice with its snapshot fields (including the non-null `roundingStepMinutes` snapshot), status, and the set of linked time entries. Each linked time-entry summary MUST include both the original raw `durationSeconds` and a `roundedDurationSeconds` value computed by applying per-entry ceiling rounding with the invoice's `roundingStepMinutes` snapshot, so the detail surface can display the rounded billed duration per entry without recomputing it client-side. PMs must also have `canViewInvoices = true` to access the endpoint.

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

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices/:id` for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot read a workspace-wide invoice

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices/:id` for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: Cross-workspace invoice is not found

- **WHEN** a user requests `GET /invoices/:id` for an invoice in another workspace
- **THEN** the backend rejects with `404 Not Found`

#### Scenario: PM without invoice permission is denied detail read

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices/:id`
- **THEN** the system rejects the request as forbidden

### Requirement: Invoice Can Be Deleted By Admin Only

DELETE /invoices/:id MUST be restricted to Admins and to invoices whose current status is draft, including invoices manually returned to draft. Deletion releases the linked entries.

#### Scenario: Admin deletes a draft invoice

- **WHEN** an admin requests `DELETE /invoices/:id` for a draft invoice in their workspace
- **THEN** the backend deletes the invoice

#### Scenario: Sent invoice cannot be deleted

- **WHEN** an admin requests `DELETE /invoices/:id` for an invoice with status `sent`
- **THEN** the backend rejects with `409 Conflict`
- **AND** the invoice remains in the database

#### Scenario: Paid invoice cannot be deleted

- **WHEN** an admin requests `DELETE /invoices/:id` for an invoice with status `paid`
- **THEN** the backend rejects with `409 Conflict`
- **AND** the invoice remains in the database

#### Scenario: Concurrent status change blocks deletion

- **GIVEN** an admin issues `DELETE /invoices/:id` for a draft invoice
- **AND** a concurrent request changes the invoice status to `sent` before the delete executes
- **THEN** the delete fails with `409 Conflict`
- **AND** the invoice remains in the database with the updated status

#### Scenario: PM is denied deletion

- **WHEN** a PM requests `DELETE /invoices/:id`
- **THEN** the backend rejects with `403 Forbidden`

### Requirement: Invoice Deletion Unlinks Time Entries

Deleting an invoice MUST unlink its time entries by clearing their invoice link, making them eligible for a later invoice, according to the documented foreign-key behavior.

#### Scenario: Deletion makes entries re-billable

- **GIVEN** an invoice is linked to several time entries
- **WHEN** an admin deletes that invoice
- **THEN** the linked time entries have their invoice link cleared
- **AND** those entries become eligible for inclusion in a new invoice

#### Scenario: Deletion does not delete time entries

- **WHEN** an admin deletes an invoice
- **THEN** no time entry row is removed by the deletion

### Requirement: Invoice Totals Use Snapshot Values

The backend MUST compute invoice totals as the sum of tracked hours of selected entries multiplied by the invoice hourly rate, less the optional percentage discount, and MUST store `hourly_rate`, `currency`, `total_hours`, `total_amount`, and `rounding_step_minutes` as snapshot values at creation time and on an explicit revision to billing inputs or entry selection. Because the snapshot rounding step is always a positive integer between 1 and 60, the backend MUST always apply per-entry ceiling rounding: each eligible time entry's duration is rounded up to the nearest multiple of the step (in seconds) before the rounded durations are summed. Per-entry rounding is always active — there is no raw-sum mode — and with the minimum step of 1 minute each entry is still rounded up to whole minutes. Original time-entry records MUST NOT be modified by the rounding computation.

#### Scenario: Totals reflect the creation snapshot

- **GIVEN** an invoice is created with a given hourly rate, currency, and discount
- **WHEN** the backend computes and stores totals
- **THEN** the stored `total_amount` equals `total_hours * hourly_rate * (1 - discount_percent / 100)`
- **AND** the stored rate, currency, totals, and rounding step do not change when the workspace default rate or currency or the project rounding step changes later

#### Scenario: Later time-entry edits do not recalculate totals

- **GIVEN** an invoice exists with snapshot totals
- **WHEN** a linked time entry is edited after invoice creation
- **THEN** the invoice `total_hours` and `total_amount` remain as originally captured

#### Scenario: Totals are rounded up to the next whole cent (ceiling)

- **GIVEN** an invoice is created with 0.5 tracked hours at a rate of $75.21
- **WHEN** the backend computes the total amount
- **THEN** the stored `total_amount` is $37.61 (rounded up from 37.605)
- **AND** the computation uses integer fixed-point arithmetic to avoid floating-point drift
- **AND** any fractional cent is always rounded UP, never down or truncated

#### Scenario: Sub-cent fractional amounts round up to the next cent

- **GIVEN** an invoice is created with 3.33 tracked hours at a rate of $10.01 and a 90% discount
- **WHEN** the backend computes the total amount (3.33 x 10.01 x 0.1 = 3.3333)
- **THEN** the stored `total_amount` is $3.34 (ceiling), not $3.33 (half-up)
- **AND** the rounding mode is ceiling so the billed amount never loses a fractional cent

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

### Requirement: Eligible Time Entries Can Be Previewed Before Invoice Creation

The backend MUST expose a protected `GET /invoices/eligible-entries` endpoint for `admin` and `pm` users that returns the set of completed, billable, not-yet-invoiced time entries matching a given date range and optional project scope, along with the computed total hours — without creating an invoice or modifying any data. Rounding is always active: the endpoint MUST accept an optional `roundingStepMinutes` query parameter (positive integer between 1 and 60); when supplied, the computed total hours MUST reflect per-entry ceiling rounding using that step. When `roundingStepMinutes` is omitted, the total hours MUST reflect per-entry ceiling rounding with the effective default step: for project-scoped previews the project's `timeRoundingStepMinutes` when set, otherwise the workspace's `timeRoundingStepMinutes`; for workspace-wide previews the workspace's `timeRoundingStepMinutes`. The response MUST always include a non-null `defaultRoundingStepMinutes` — the effective default step — alongside the existing `defaultHourlyRate` and `defaultCurrency`. Each returned entry MUST include both the original raw `durationSeconds` and a `roundedDurationSeconds` value computed by applying per-entry ceiling rounding with the effective rounding step, so the preview surface can display the rounded billed duration per entry. PMs must also have `canViewInvoices = true` to access the endpoint.

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

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices/eligible-entries` without a `projectId`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot preview entries for an unassigned private project

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices/eligible-entries?projectId=X` for a private project they are not assigned to
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

#### Scenario: PM without invoice permission is denied preview

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices/eligible-entries`
- **THEN** the system rejects the request as forbidden

### Requirement: Invoice Stats Can Be Retrieved

The backend MUST expose a protected `GET /invoices/stats` endpoint for `admin` and `pm` users that returns aggregate invoice counts grouped by status and a summary of invoices created in the current calendar month, scoped to the caller's visibility (admins see all workspace invoices; PMs see only invoices for visible projects). PMs must also have `canViewInvoices = true` to access the endpoint.

#### Scenario: Admin retrieves workspace-wide stats

- **WHEN** an admin requests `GET /invoices/stats`
- **THEN** the backend returns counts for `draft`, `sent`, and `paid` statuses across all workspace invoices
- **AND** returns the count of invoices created in the current calendar month, the sum of their `total_amount`, the count of distinct projects, and the workspace default currency

#### Scenario: PM retrieves stats for visible projects only

- **WHEN** a PM with `canViewInvoices = true` requests `GET /invoices/stats`
- **THEN** the backend returns counts only for invoices scoped to active public projects or private projects assigned to the PM
- **AND** workspace-wide invoices (null `projectId`) are excluded from the counts

#### Scenario: Member is denied

- **WHEN** an ordinary member requests `GET /invoices/stats`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: Workspace with no invoices returns zero counts

- **WHEN** the workspace has no invoices
- **THEN** the backend returns zero counts for all statuses and zero totals for the current month
- **AND** all numeric values are returned as JSON numbers (not strings) regardless of the database driver's textual representation of SQL aggregate results

#### Scenario: Multi-currency totalAmount is approximate

- **GIVEN** the workspace contains invoices in multiple currencies
- **WHEN** the backend computes `thisMonth.totalAmount`
- **THEN** the sum includes all currencies without conversion
- **AND** the workspace default currency is returned for display purposes
- **AND** the UI SHOULD note that totals are approximate when multiple currencies are present

#### Scenario: PM without invoice permission is denied stats

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices/stats`
- **THEN** the system rejects the request as forbidden

### Requirement: Invoice Defaults Endpoint For Admins And PMs

The backend MUST provide a `GET /invoices/defaults` endpoint that returns the workspace-level invoice default fields (`currency`, `defaultHourlyRate`, `timeRoundingStepMinutes`, sender, optional logo and payment defaults) to both admin and PM users with `canViewInvoices = true`. Members and PMs without the permission are denied.

#### Scenario: Admin retrieves invoice defaults

- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester calls `GET /invoices/defaults`
- **THEN** the system returns the workspace settings' `currency`, `defaultHourlyRate`, and `timeRoundingStepMinutes`

#### Scenario: PM with invoice permission retrieves defaults

- **GIVEN** the requester is a PM with `canViewInvoices = true`
- **WHEN** the requester calls `GET /invoices/defaults`
- **THEN** the system returns the workspace settings' `currency`, `defaultHourlyRate`, and `timeRoundingStepMinutes`

#### Scenario: PM without invoice permission is denied defaults

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices/defaults`
- **THEN** the system rejects the request as forbidden

#### Scenario: Member is denied defaults

- **GIVEN** the requester is a member (non-admin, non-PM)
- **WHEN** the requester calls `GET /invoices/defaults`
- **THEN** the system rejects the request as forbidden

#### Scenario: Invoice defaults expose a billing-only projection

- **GIVEN** a permitted PM cannot read Admin Settings
- **WHEN** the PM opens the invoice editor
- **THEN** invoice defaults are readable in the active workspace without exposing unrelated workspace settings or allowing the PM to modify defaults.

### Requirement: Invoice Revisions And Status Selection

The protected PATCH /invoices/:id MUST allow Admins and PMs with invoice access to change status, title, project/scope, billing period, hourly rate, currency, discount, rounding, sender, recipient, services, payment instructions, notes and selected entries in every status. A change of status alone MUST have no email, export or billing side effects. Server-assigned identity, audit fields and totals MUST remain server-controlled.

#### Scenario: Admin updates invoice status

- **WHEN** an admin submits a valid update changing the status from `draft` to `sent`
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: PM updates status for an assigned project

- **WHEN** a PM with `canViewInvoices = true` submits a valid update changing the status from `draft` to `sent` for an invoice scoped to a project they are assigned to
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: Status transition from sent to paid

- **GIVEN** an invoice with status `sent`
- **WHEN** an admin or PM submits an update changing the status to `paid`
- **THEN** the backend persists the new status and returns the updated invoice

#### Scenario: Update does not recompute totals

- **GIVEN** an invoice was created with snapshot totals and a `roundingStepMinutes` of 5
- **WHEN** an update request changes a non-total field
- **THEN** the stored `total_hours`, `total_amount`, and `roundingStepMinutes` remain as originally captured

#### Scenario: PM updates only assigned-project invoices

- **WHEN** a PM with `canViewInvoices = true` submits an update for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot update a workspace-wide invoice

- **WHEN** a PM with `canViewInvoices = true` submits an update for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM without invoice permission is denied update

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `PATCH /invoices/:id`
- **THEN** the system rejects the request as forbidden

#### Scenario: Select a previous status

- **GIVEN** an authorized user opens a sent or paid invoice
- **WHEN** the user selects any supported status, including sent to draft or paid to sent
- **THEN** selecting the current value is a no-op; for a changed value the saved status is returned and subsequent detail, list, filter and status counts reflect it.

#### Scenario: Revise charges atomically

- **GIVEN** a draft, sent or paid invoice contains billed entries
- **WHEN** a user changes billing inputs and submits a selection of retained and newly eligible entries
- **THEN** one commit saves business fields, selected links, rounded hours and amount; excluded entries become unlinked and eligible again without changing tracked work.

#### Scenario: Retain selections on partial update

- **GIVEN** an invoice has linked entries
- **WHEN** a valid update omits entry selection
- **THEN** the current set remains selected; if any would be outside the new project or period the request fails so the caller can review the selection.

#### Scenario: Reject stale or invalid revisions

- **GIVEN** an editor has loaded an invoice revision
- **WHEN** another writer saves first, an explicitly selected entry becomes unavailable, or validation or linking fails
- **THEN** the rejected revision changes no fields, totals or links and a stale revision or conflicting claim returns a conflict suitable for review and retry.

#### Scenario: Authorize both scopes

- **GIVEN** a permitted PM can see an invoice
- **WHEN** the PM changes its project to a workspace-wide or inaccessible scope or includes an entry from another workspace
- **THEN** the API rejects the complete update without moving the invoice or claiming entries.

### Requirement: Billing Revision Preview

The API MUST support a read-only preview of an authorized create or edit selection with the proposed project, date range, rate, discount, currency and rounding. Preview and save MUST apply the same eligibility and arithmetic.

#### Scenario: Review retained entries under a proposed period

- **GIVEN** an accessible invoice owns some entries in the proposed period
- **WHEN** its editor requests a preview
- **THEN** entries billed to this invoice and eligible unbilled entries within the proposed scope are available; entries linked elsewhere are excluded, and subtotal, hours, discount and total reflect the proposed selection.

### Requirement: Download Saved Invoice PDF

The backend MUST offer an authorized PDF download from a consistent saved invoice revision, with the same workspace, role and project access as reading the invoice detail.

#### Scenario: Export a saved revision

- **GIVEN** an invoice has saved parties, billing terms, selected entries and payment instructions
- **WHEN** a caller downloads it during an unsaved edit
- **THEN** the document contains its reference, issued date, billing period, saved parties, optional logo, service descriptions, selected line quantities, rates, amounts, subtotal, currency, discount, total and payment instructions. Personal groups, excluded entries and unsaved edits are absent.

#### Scenario: Export a long invoice

- **GIVEN** the saved invoice has long descriptions and many entries
- **WHEN** the PDF is generated
- **THEN** descriptions wrap, rows and totals remain readable across pages, and absence of a logo does not prevent download.

#### Scenario: Protect a direct download

- **GIVEN** a caller lacks detail access
- **WHEN** they request the PDF directly
- **THEN** the API denies access before returning document bytes.

#### Scenario: Complete missing historical fields before export

- **GIVEN** a legacy invoice lacks issuer, recipient, services or payment information
- **WHEN** an authorized caller requests its PDF
- **THEN** the API identifies the missing information for correction before download; reading, editing and changing status remain available.

### Requirement: Create From An Accessible Invoice

The system MUST allow an authorized caller to reuse the saved business details and billing parameters of an accessible source to prepare an independent draft.

#### Scenario: Review before creating

- **GIVEN** a paid source belongs to an accessible project
- **WHEN** the caller reviews a new period, destination group and eligible entries then saves
- **THEN** normal creation rules assign a fresh reference and draft status, use reviewed fields and eligible entries only, and preserve the source and its links.

### Requirement: Persist and export invoice dates and applicable payment details

The API SHALL persist issueDate and nullable dueDate in the invoice revision. Date changes SHALL use the existing revision and authorization checks. PDF export SHALL use saved dates and the selected method's payment details.

#### Scenario: Export the revised document

- **WHEN** an authorized user exports an invoice with dates and Card payment details
- **THEN** the PDF includes Issue date, Due date when set, provider, instructions and a clickable HTTPS payment link when supplied
- **AND** bank-only details retained in the saved object are excluded from Card output

#### Scenario: Preserve a historical invoice

- **WHEN** an older invoice is migrated or exported
- **THEN** its issue date is derived deterministically from creation in the workspace timezone, its due date remains null, and existing financial totals and linked entries are preserved

### Requirement: Save and revise the invoice time format

The API SHALL save the selected mode with the invoice revision. A mode-only update SHALL use the usual workspace, role, project access and revision checks. It SHALL preserve the saved billing inputs, entry links, snapshots and monetary totals.

#### Scenario: Authorized revision or stale edit

- **GIVEN** a PM can access an invoice and its source task has since been renamed
- **WHEN** the PM submits only a new mode and the current expected revision
- **THEN** the changed invoice uses its saved entry names, durations and totals without reselecting entries
- **WHEN** another editor submits a mode change using the stale revision or a PM without project access attempts an update
- **THEN** the API returns the applicable conflict or access error and preserves the saved revision

#### Scenario: Copy for a new period

- **GIVEN** the source invoice uses Task mode
- **WHEN** the user creates from that invoice and reviews a different period
- **THEN** the draft starts in Task mode and normal eligibility and selection rules determine its new entries
- **AND** changing the new invoice's mode or selections leaves the source intact

#### Scenario: Preview matches creation

- **WHEN** identical entries and billing inputs are previewed and saved under either display mode
- **THEN** both modes return the same selected entry IDs, billed hours, subtotal, discount and total
- **AND** the same eligibility and duplicate-billing checks apply

### Requirement: Export the saved invoice time format

PDF export SHALL use the saved display mode. Time entry mode SHALL retain the individual service lines. Task mode SHALL show one service line per included task with its saved task name, summed billed hours, invoice rate and pre-discount amount. Entry dates, worker names and entry descriptions SHALL be omitted from the task lines. Task line amounts SHALL sum the cents already allocated to their entries by the invoice's cumulative proportional allocation in saved entry order.

#### Scenario: Interleaved tasks share a fractional-cent subtotal

- **GIVEN** three entries have equal billed duration, the saved order is A, B, A and the pre-discount subtotal is ten cents
- **WHEN** the PDF is exported in Task mode
- **THEN** the entry allocations of three, four and three cents produce six cents for task A and four for task B
- **AND** the subtotal, discount and invoice total match the Time entry PDF

#### Scenario: Readable export from the saved revision

- **WHEN** a Task invoice with long task names or enough included tasks for multiple pages is downloaded during an unsaved edit
- **THEN** the PDF wraps task names, paginates readable rows and totals, and uses only the saved revision

#### Scenario: No included time

- **WHEN** an otherwise exportable Task invoice has no selected entries
- **THEN** its PDF contains no task lines and shows zero subtotal, discount amount and total

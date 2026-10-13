# Spec Delta

## Purpose

Define protected invoice endpoints that let Admins and PMs bill completed workspace time entries, while guaranteeing each time entry is billed on at most one invoice and that invoice totals remain stable snapshots.

## ADDED Requirements

### Requirement: Invoices Can Be Listed By Admins And PMs

The backend MUST expose a protected `GET /invoices` endpoint for `admin` and `pm` users that lists invoices within the authenticated user's workspace, with shared pagination and optional filters by project, status, date range, and search text.

#### Scenario: Admin lists all workspace invoices

- **WHEN** an admin requests `GET /invoices` with the workspace JWT claim
- **THEN** the backend returns every invoice in that workspace
- **AND** paginates the result with shared list metadata

#### Scenario: Member is denied

- **WHEN** an ordinary member requests `GET /invoices`
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM lists only assigned-project invoices

- **WHEN** a PM requests `GET /invoices` with the workspace JWT claim
- **THEN** the backend returns only invoices whose project is an active public project or a private project assigned to that PM
- **AND** omits invoices for private projects the PM is not assigned to

#### Scenario: PM does not see workspace-wide invoices

- **WHEN** a PM requests `GET /invoices`
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

### Requirement: Invoice Can Be Created From Eligible Time Entries

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, and optional notes.

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

#### Scenario: Missing rate falls back to workspace settings

- **GIVEN** the create body omits the hourly rate
- **WHEN** the workspace settings define a default hourly rate
- **THEN** the backend uses that default rate as the snapshot rate
- **WHEN** no default rate is configured and no rate is supplied
- **THEN** the backend rejects with a validation error

#### Scenario: Discount with more than two decimal places is rejected

- **GIVEN** a create request carries a `discountPercent` with more than 2 decimal places
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Invoice Eligibility Excludes Ineligible Time Entries

Invoice creation MUST select only time entries that are completed, billable, belong to the requested workspace, and fall within the requested project and date range, and MUST exclude running, non-billable, and already-invoiced entries.

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

### Requirement: Invoice Creation Is Atomic And Prevents Duplicate Billing

Invoice creation MUST select eligible time entries, insert the invoice, and set `invoice_id` on the selected entries within a single database transaction, so concurrent invoice creation requests cannot link the same time entry to two invoices.

#### Scenario: Concurrent creation does not double-bill an entry

- **GIVEN** two invoice creation requests target the same eligible time entry at the same time
- **WHEN** both requests attempt to link the entry
- **THEN** exactly one request succeeds in linking the entry
- **AND** the other request either excludes the entry because it is already linked or fails without creating a duplicate billing link

#### Scenario: Failed association rolls back the invoice

- **GIVEN** invoice creation inserts the invoice row but the entry-link update fails
- **WHEN** the transaction aborts
- **THEN** no invoice row remains and no time entry is linked to a partial invoice

### Requirement: Invoice Details Can Be Read

The backend MUST expose a protected `GET /invoices/:id` endpoint for `admin` and `pm` users that returns a single invoice with its snapshot fields, status, and the set of linked time entries.

#### Scenario: Admin reads any workspace invoice

- **WHEN** an admin requests `GET /invoices/:id` for an invoice in their workspace
- **THEN** the backend returns the invoice detail including snapshot totals and linked entries

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

The backend MUST expose a protected `PATCH /invoices/:id` endpoint for `admin` and `pm` users that updates editable fields — status, notes, and other fields allowed by the shared update contract — without recalculating snapshot totals or changing the linked time-entry set.

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

#### Scenario: Paid is a terminal status

- **GIVEN** an invoice with status `paid`
- **WHEN** a user attempts to change the status back to `draft` or `sent`
- **THEN** the backend accepts the update if the request is otherwise valid
- **AND** the status is changed (the API does not enforce one-way transitions)
- **BUT** the UI SHOULD only present forward transitions (draft to sent to paid) via header action buttons to prevent accidental reversion

#### Scenario: Update does not recompute totals

- **GIVEN** an invoice was created with snapshot totals
- **WHEN** an update request changes a non-total field
- **THEN** the stored `total_hours` and `total_amount` remain as originally captured

#### Scenario: PM updates only assigned-project invoices

- **WHEN** a PM submits an update for an invoice whose project is a private project the PM is not assigned to
- **THEN** the backend rejects with `403 Forbidden`

#### Scenario: PM cannot update a workspace-wide invoice

- **WHEN** a PM submits an update for an invoice with no project scope
- **THEN** the backend rejects with `403 Forbidden`

### Requirement: Invoice Can Be Deleted By Admin Only

The backend MUST expose a protected `DELETE /invoices/:id` endpoint restricted to `admin` users that removes the invoice. Only invoices in `draft` status can be deleted; `sent` or `paid` invoices are locked to prevent re-billing of already invoiced time entries.

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

The backend MUST compute invoice totals as the sum of tracked hours of selected entries multiplied by the invoice hourly rate, less the optional percentage discount, and MUST store `hourly_rate`, `currency`, `total_hours`, and `total_amount` as snapshot values at creation time.

#### Scenario: Totals reflect the creation snapshot

- **GIVEN** an invoice is created with a given hourly rate, currency, and discount
- **WHEN** the backend computes and stores totals
- **THEN** the stored `total_amount` equals `total_hours * hourly_rate * (1 - discount_percent / 100)`
- **AND** the stored rate, currency, and totals do not change when the workspace default rate or currency changes later

#### Scenario: Later time-entry edits do not recalculate totals

- **GIVEN** an invoice exists with snapshot totals
- **WHEN** a linked time entry is edited after invoice creation
- **THEN** the invoice `total_hours` and `total_amount` remain as originally captured

#### Scenario: Totals are rounded correctly at half-cent boundaries

- **GIVEN** an invoice is created with 0.5 tracked hours at a rate of $75.21
- **WHEN** the backend computes the total amount
- **THEN** the stored `total_amount` is $37.61 (rounded up from 37.605)
- **AND** the computation uses integer fixed-point arithmetic to avoid floating-point drift

#### Scenario: Computed total exceeding the storage limit is rejected

- **GIVEN** the computed `total_amount` exceeds the maximum value storable in `NUMERIC(12,2)`
- **WHEN** the backend attempts to create the invoice
- **THEN** the backend rejects with `422 Unprocessable Entity`
- **AND** no invoice row is persisted

### Requirement: Eligible Time Entries Can Be Previewed Before Invoice Creation

The backend MUST expose a protected `GET /invoices/eligible-entries` endpoint for `admin` and `pm` users that returns the set of completed, billable, not-yet-invoiced time entries matching a given date range and optional project scope, along with the computed total hours — without creating an invoice or modifying any data.

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

#### Scenario: dateTo before dateFrom is rejected

- **WHEN** a request carries `dateTo` earlier than `dateFrom`
- **THEN** the backend rejects with a validation error
# Delta: invoices-api

## Added Requirements

### Requirement: Invoice Defaults Endpoint For Admins And PMs

The backend MUST provide a `GET /invoices/defaults` endpoint that returns the workspace-level invoice default fields (`currency`, `defaultHourlyRate`, `timeRoundingStepMinutes`) to both admin and PM users with `canViewInvoices = true`. Members and PMs without the permission are denied.

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

## Modified Requirements

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

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, and optional notes. PMs must also have `canViewInvoices = true` to access the endpoint.

#### Scenario: Admin creates an invoice across a project and date range

- **WHEN** an admin submits a valid create body scoped to a project and date range
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

#### Scenario: PM without invoice permission is denied creation

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `POST /invoices`
- **THEN** the system rejects the request as forbidden

### Requirement: Invoice Details Can Be Read

The backend MUST expose a protected `GET /invoices/:id` endpoint for `admin` and `pm` users that returns a single invoice with its snapshot fields, status, and the set of linked time entries. PMs must also have `canViewInvoices = true` to access the endpoint.

#### Scenario: Admin reads any workspace invoice

- **WHEN** an admin requests `GET /invoices/:id` for an invoice in their workspace
- **THEN** the backend returns the invoice detail including snapshot totals and linked entries

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

### Requirement: Invoice Can Be Updated

The backend MUST expose a protected `PATCH /invoices/:id` endpoint for `admin` and `pm` users that updates editable fields — status, notes, and other fields allowed by the shared update contract — without recalculating snapshot totals or changing the linked time-entry set. PMs must also have `canViewInvoices = true` to access the endpoint.

The `sent` status is a semantic marker: the backend does not send an email, generate a PDF, or notify external systems when an invoice transitions to `sent`. Email delivery and PDF generation are deferred to a future milestone. The UI labels this action "Mark as sent" to make the manual nature of the transition clear.

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

- **GIVEN** an invoice was created with snapshot totals
- **WHEN** an update request changes a non-total field
- **THEN** the stored `total_hours` and `total_amount` remain as originally captured

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

### Requirement: Eligible Time Entries Can Be Previewed Before Invoice Creation

The backend MUST expose a protected `GET /invoices/eligible-entries` endpoint for `admin` and `pm` users that returns the set of completed, billable, not-yet-invoiced time entries matching a given date range and optional project scope, along with the computed total hours — without creating an invoice or modifying any data. PMs must also have `canViewInvoices = true` to access the endpoint.

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

#### Scenario: Preview does not modify data

- **WHEN** a preview request is executed
- **THEN** no invoice row is created
- **AND** no time entry `invoice_id` is set
- **AND** no database transaction is started
- **AND** the response includes `userName` and `taskName` for each entry so the UI can display them without additional lookups

#### Scenario: dateTo before dateFrom is rejected

- **WHEN** a request carries `dateTo` earlier than `dateFrom`
- **THEN** the backend rejects with a validation error

#### Scenario: PM without invoice permission is denied preview

- **GIVEN** the requester is a PM with `canViewInvoices = false`
- **WHEN** the requester calls `GET /invoices/eligible-entries`
- **THEN** the system rejects the request as forbidden
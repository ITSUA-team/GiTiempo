# Spec Delta

## Purpose

Define the admin SPA invoice management surface behavior — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware interactions for Admin and PM users.

## ADDED Requirements

### Requirement: Invoice List Page

The invoices list page MUST display a searchable, filterable table of invoices with stats cards, pagination, and a create action, using only backend-provided data.

#### Scenario: Admin sees the full invoice list

- **GIVEN** an authenticated admin opens the invoices page
- **WHEN** invoice data loads successfully
- **THEN** the page shows a table with columns: Title, Project, Period (dateFrom–dateTo), Hours (totalHours), Amount (totalAmount with currency), and a Status badge (draft/sent/paid)
- **AND** each row's Title is a link that navigates to the invoice detail page
- **AND** the Amount column is formatted using `Intl.NumberFormat` with the invoice's `currency` field
- **AND** the page shows a `Create invoice` action button in the table header

#### Scenario: PM sees scoped invoice list

- **GIVEN** an authenticated PM opens the invoices page
- **WHEN** invoice data loads successfully
- **THEN** the table shows only invoices for projects visible to the PM
- **AND** workspace-wide invoices (null projectId) are not shown to PMs
- **AND** the `Create invoice` action button is visible

#### Scenario: Search filters by invoice title

- **GIVEN** an admin or PM is on the invoices page with loaded data
- **WHEN** the user types in the global search control
- **THEN** the page sends the `search` query parameter to the invoice list endpoint
- **AND** the results are filtered server-side by case-insensitive title match

#### Scenario: Filter row narrows results

- **GIVEN** an admin or PM is on the invoices page
- **WHEN** the user selects a Project, Date range, or Status filter
- **THEN** the page sends the corresponding `projectId`, `dateFrom`, `dateTo`, or `status` query parameters to the invoice list endpoint
- **AND** no amount filter is offered because the API does not support it
- **AND** clearing filters restores the full role-allowed result set

#### Scenario: Pagination controls page navigation

- **GIVEN** the invoice list returns more than one page of results
- **WHEN** the user navigates pages
- **THEN** the page shows a pagination control below the table
- **AND** the current page and total pages are derived from the API `meta` response

#### Scenario: Stats cards display invoice summaries

- **GIVEN** an admin or PM opens the invoices page
- **WHEN** invoice stats load successfully
- **THEN** the page shows three stats cards from `GET /invoices/stats`
- **AND** the "Open Invoices" card shows draft + sent count with subtitle "N ready to send" (N = draft count)
- **AND** the "Billed This Month" card shows the sum of `totalAmount` for invoices created this month with subtitle "N invoices · M projects"
- **AND** the "Drafts" card shows the draft count with subtitle "Ready for review"
- **AND** the "Billed This Month" total uses the single currency returned by the API `thisMonth` field (multi-currency approximation note is a future enhancement pending API support for per-currency breakdown)

### Requirement: Invoice Create Dialog

The invoices page MUST provide a create dialog that submits only contract-supported fields and previews eligible time entries from the backend.

#### Scenario: Admin creates a workspace-wide invoice

- **GIVEN** an authenticated admin opens the create dialog
- **WHEN** the dialog renders
- **THEN** it shows fields: Title (required), Project (optional), Date range (required), Hourly rate (optional, placeholder "From workspace settings"), Currency (optional, PrimeVue `<Select>` with the same currency options as Settings → Currency, placeholder "Auto"), Discount (optional, default 0), and Notes (optional)
- **AND** the admin may leave Project empty to create a workspace-wide invoice
- **AND** no Status field is shown — the invoice is always created as `draft`

#### Scenario: PM must select a project

- **GIVEN** an authenticated PM opens the create dialog
- **WHEN** the dialog renders
- **THEN** the Project field is required and limited to projects assigned to the PM
- **AND** submitting without a project is blocked

#### Scenario: Live eligible-entries preview

- **GIVEN** the user has entered a Date range (and a Project for PMs)
- **WHEN** the preview loads from `GET /invoices/eligible-entries`
- **THEN** the dialog shows total hours and computed total amount from the preview response
- **AND** an expandable section shows eligible time entries (Date, User, Duration, Description) in a scrollable table
- **AND** the Hourly rate field is pre-filled with `defaultHourlyRate` from the preview response when available
- **AND** Currency is pre-selected with the workspace settings currency as soon as the dialog opens, and the preview `defaultCurrency` fills it only while the workspace settings currency is not yet loaded

#### Scenario: Currency dropdown mirrors workspace settings

- **GIVEN** the user opens the create dialog while the workspace settings currency is known
- **WHEN** the dialog renders
- **THEN** the Currency dropdown lists the same currency options as Settings → Currency (plus the persisted workspace currency first when it is outside the standard option list)
- **AND** the workspace settings currency is already selected before any preview request
- **AND** after the user selects a currency, neither the workspace currency nor preview defaults re-select it automatically

#### Scenario: Empty preview warning

- **GIVEN** the eligible-entries preview returns zero entries
- **WHEN** the preview result is displayed
- **THEN** the dialog shows a warning banner "No billable entries found for this project and date range"
- **AND** the `Create invoice` button remains enabled because the API allows empty invoices

#### Scenario: Successful creation

- **GIVEN** the user has filled required fields
- **WHEN** the user activates `Create invoice`
- **THEN** the page sends a POST request with only contract-supported fields
- **AND** on success the dialog closes, a success toast is shown, and the invoice list refreshes

#### Scenario: Domain error on missing rate or currency

- **GIVEN** the user submits without an hourly rate or currency and the workspace has no default
- **WHEN** the API returns 422 with `invoice_rate_required` or `invoice_currency_required`
- **THEN** the page shows an error toast with the API message
- **AND** the dialog remains open with the user's input preserved

#### Scenario: Domain error on total overflow

- **GIVEN** the computed total amount exceeds the maximum
- **WHEN** the API returns 422 with `invoice_total_overflow`
- **THEN** the page shows an error toast with the API message
- **AND** the dialog remains open

### Requirement: Invoice Detail Page

The invoice detail page MUST display the full invoice with status-dependent actions, a read-only summary, editable fields, and linked time entries.

#### Scenario: Detail page renders full invoice

- **GIVEN** an admin or PM navigates to `/invoices/:id`
- **WHEN** the invoice loads successfully
- **AND** the page topbar shows "Invoices" as the page name (the invoice title is displayed in the page header below the topbar; a dynamic topbar breadcrumb with the invoice title is a future enhancement)
- **AND** the page header shows a back button, the invoice title, and a status badge
- **AND** a read-only summary card displays Project, Date range, Hourly rate, Currency, Discount, Total hours, Total amount, Created, Created by, and Last updated
- **AND** an editable card shows Title (input) and Notes (textarea) with a `Save changes` button
- **AND** a time entries card shows linked entries (Date, User, Task, Duration, Description) with entry count and total hours in the header

#### Scenario: Draft status actions

- **GIVEN** the invoice has status `draft`
- **WHEN** the detail page renders
- **THEN** the header shows a `Mark as sent` action (admin + PM) and a `Delete` action (admin only)
- **AND** PMs do not see the Delete action

#### Scenario: Sent status actions

- **GIVEN** the invoice has status `sent`
- **WHEN** the detail page renders
- **THEN** the header shows a `Mark as paid` action (admin + PM)
- **AND** no Delete action is shown

#### Scenario: Paid status actions

- **GIVEN** the invoice has status `paid`
- **WHEN** the detail page renders
- **THEN** no status actions are shown in the header

#### Scenario: Mark as sent is semantic only

- **GIVEN** an admin or PM activates `Mark as sent` on a draft invoice
- **WHEN** the PATCH succeeds
- **THEN** the invoice status changes to `sent`
- **AND** the UI label makes the manual nature of the transition clear
- **AND** no email is sent and no PDF is generated

#### Scenario: Editable fields save

- **GIVEN** an admin or PM edits the Title or Notes in the editable card
- **WHEN** the user activates `Save changes`
- **THEN** the page sends a PATCH request with only `title` and/or `notes`
- **AND** on success a success toast is shown and the detail refreshes
- **AND** snapshot fields (rate, currency, discount, totals, dates) are not editable

### Requirement: Invoice Deletion

The invoice detail page MUST support draft-only deletion with confirmation, restricted to admin users.

#### Scenario: Admin deletes a draft invoice

- **GIVEN** an admin views a draft invoice and activates `Delete`
- **WHEN** a confirmation dialog appears with the message "Delete this invoice? Linked time entries will be unlinked and become available for future invoices."
- **AND** the admin confirms
- **THEN** the page sends a DELETE request
- **AND** on success a success toast is shown and the user is navigated back to the invoices list

#### Scenario: PM cannot delete

- **GIVEN** a PM views any invoice
- **WHEN** the detail page renders
- **THEN** no Delete action is shown regardless of invoice status

#### Scenario: Delete conflict on non-draft invoice

- **GIVEN** an admin attempts to delete an invoice whose status is no longer `draft`
- **WHEN** the API returns 409 with `invoice_not_deletable`
- **THEN** the page shows an error toast with a user-friendly message about the delete conflict
- **AND** the detail page refreshes to show the current invoice state

### Requirement: Status Transition Conflict Handling

The invoice detail page MUST handle optimistic concurrency and invalid transition errors by refreshing state and surfacing the failure.

#### Scenario: Concurrent update conflict

- **GIVEN** an admin or PM activates a status action or saves edits
- **WHEN** the API returns 409 with `invoice_update_conflict`
- **THEN** the page shows an error toast advising the user to retry
- **AND** the detail page reloads the current invoice state from the API
- **AND** the user's unsaved local edits are not silently discarded without feedback

#### Scenario: Invalid status transition

- **GIVEN** an admin or PM attempts a backward status transition
- **WHEN** the API returns 409 with `invoice_invalid_status_transition`
- **THEN** the page shows an error toast with a user-friendly message about the invalid transition
- **AND** the detail page shows the current valid status

### Requirement: Invoice Navigation Visibility

The invoices nav item MUST be visible to admin and PM users after the invoice UI ships.

#### Scenario: Nav item appears for admin and PM

- **GIVEN** an authenticated admin or PM renders the admin shell
- **WHEN** the shell navigation renders
- **THEN** the Invoices nav item is visible in the sidebar and mobile bottom nav
- **AND** the Invoices nav item is not gated behind a feature flag

#### Scenario: Nav item hidden for members

- **GIVEN** an authenticated member renders the admin shell
- **WHEN** the shell navigation renders
- **THEN** the Invoices nav item is not shown

### Requirement: Invoice Page Loading And Error States

The invoices list and detail pages MUST implement distinct loading, empty, and retryable error states.

#### Scenario: Initial list load shows skeleton

- **GIVEN** an admin or PM opens the invoices page for the first time
- **WHEN** invoice data is loading
- **THEN** the page shows a loading skeleton matching the stats header and table structure
- **AND** no empty-state message is shown before the initial request finishes

#### Scenario: List load failure shows retryable error

- **GIVEN** the invoice list request fails
- **WHEN** the error is rendered
- **THEN** the page shows a retryable error card with the error message
- **AND** the error state is distinct from the empty state

#### Scenario: Empty list shows empty state

- **GIVEN** the invoice list request succeeds but returns zero invoices
- **WHEN** the result is rendered
- **THEN** the page shows an empty state appropriate for no invoices
- **AND** the empty state is distinct from a request error

#### Scenario: Detail load failure shows retryable error

- **GIVEN** an admin or PM navigates to an invoice detail page
- **WHEN** the invoice detail request fails
- **THEN** the page shows a retryable error surface
- **AND** a 404 response shows a not-found message indicating the invoice does not exist

#### Scenario: Mutation feedback via toast

- **GIVEN** an admin or PM performs a create, update, status change, or delete action
- **WHEN** the action succeeds or fails
- **THEN** the page shows a success or error toast respectively
- **AND** the toast is the primary feedback channel, complementing any inline state changes

### Requirement: Invoice Mobile Responsive Layout

The invoices list page MUST render a mobile-friendly layout below the desktop breakpoint.

#### Scenario: Mobile list renders stacked cards

- **GIVEN** an admin or PM opens the invoices page on a viewport below 640px
- **WHEN** invoice data loads successfully
- **THEN** the table switches to stacked mobile record cards
- **AND** each card shows the same meaningful fields as the desktop row: title, project, period, hours, amount, and status badge
- **AND** tapping a card title navigates to the detail page

### Requirement: Invoice Currency Formatting

The invoices page MUST format all monetary amounts using the API-provided currency code, never hardcoded symbols.

#### Scenario: Currency formatting uses API currency field

- **GIVEN** an invoice has a `currency` field set to any 3-letter ISO 4217 code
- **WHEN** the amount is displayed in the list, detail, or create dialog
- **THEN** the amount is formatted using `Intl.NumberFormat` with the invoice's `currency` field
- **AND** no hardcoded currency symbols are used
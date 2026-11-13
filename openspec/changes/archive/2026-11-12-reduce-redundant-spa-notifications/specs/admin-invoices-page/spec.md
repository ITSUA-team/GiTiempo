# Spec Delta

## MODIFIED Requirements

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
- **AND** on success the dialog closes and the invoice list refreshes without a redundant success/info notification

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
- **AND** on success the detail refreshes without a redundant success/info notification
- **AND** snapshot fields (rate, currency, discount, totals, dates) are not editable

### Requirement: Invoice Deletion

The invoice detail page MUST support draft-only deletion with confirmation, restricted to admin users.

#### Scenario: Admin deletes a draft invoice

- **GIVEN** an admin views a draft invoice and activates `Delete`
- **WHEN** a confirmation dialog appears with the message "Delete this invoice? Linked time entries will be unlinked and become available for future invoices."
- **AND** the admin confirms
- **THEN** the page sends a DELETE request
- **AND** on success the user is navigated back to the invoices list without a redundant success/info notification

#### Scenario: PM cannot delete

- **GIVEN** a PM views any invoice
- **WHEN** the detail page renders
- **THEN** no Delete action is shown regardless of invoice status

#### Scenario: Delete conflict on non-draft invoice

- **GIVEN** an admin attempts to delete an invoice whose status is no longer `draft`
- **WHEN** the API returns 409 with `invoice_not_deletable`
- **THEN** the page shows an error toast with a user-friendly message about the delete conflict
- **AND** the detail page refreshes to show the current invoice state

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

- **GIVEN** an authorized admin or PM performs a create, update, status change, or delete action
- **WHEN** the action succeeds
- **THEN** the updated visible state or existing navigation communicates success without a redundant success/info notification
- **AND** failures retain actionable error toasts and their existing retry, conflict, and input-preservation behavior

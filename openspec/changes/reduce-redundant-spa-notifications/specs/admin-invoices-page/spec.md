# Spec Delta

## MODIFIED Requirements

### Requirement: Invoice Create Dialog

The invoices page MUST provide a create dialog that submits only contract-supported fields and previews eligible time entries from the backend.

#### Scenario: Admin creates a workspace-wide invoice

- **GIVEN** an authenticated admin opens the create dialog
- **WHEN** the dialog renders
- **THEN** it shows fields: Title (required), Project (optional), Date range (required), Hourly rate (defaults from settings when available), Currency (workspace currency options), Discount (optional, default 0), and Notes (optional)
- **AND** the admin may leave Project empty to create a workspace-wide invoice
- **AND** no Status field is shown — the invoice is always created as `draft`

#### Scenario: PM must select a project

- **GIVEN** an authenticated PM opens the create dialog
- **WHEN** the dialog renders
- **THEN** the Project field is required and limited to projects visible under the existing PM project-access policy
- **AND** submitting without a project is blocked

#### Scenario: Live eligible-entries preview

- **GIVEN** the user has entered a Date range (and a Project for PMs)
- **WHEN** the preview loads from `GET /invoices/eligible-entries`
- **THEN** the dialog shows the hours and amount for the included selection using the authoritative billing preview
- **AND** a selectable section shows eligible time entries (Date, User, Duration, Description) in a scrollable table
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
- **THEN** the dialog explains there are no eligible entries and suggests changing the project or period
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

#### Scenario: Create with billing details and selected entries

- **GIVEN** an authorized user opens Create invoice inside a custom group
- **WHEN** the form loads
- **THEN** the personal group is preselected and changeable, and From and How to pay use the workspace invoice defaults
- **AND** the user can edit sender, recipient, service description, payment details, billing inputs and selection before submission
- **AND** the user can exclude individual eligible entries, including all of them, and see included count, billed hours, subtotal, discount and total for the selection
- **AND** a failed preview offers retry and is distinguishable from a successful zero-entry preview

### Requirement: Invoice Detail Page

The detail page MUST display the saved invoice and let an authorized user edit its business fields and select any supported status.

#### Scenario: Detail page renders full invoice

- **GIVEN** an Admin or authorized PM opens an accessible invoice
- **WHEN** the detail loads
- **THEN** the page shows reference, status selector, personal group, sender, recipient, service description, project, period, rate, currency, rounding, included entries with dates, people, descriptions and billed time, subtotal, discount, total, payment details, notes and audit details

#### Scenario: Change status

- **GIVEN** the detail is open in any status
- **WHEN** the user selects Draft, Sent or Paid, including Sent to Draft
- **THEN** the page saves the status without sending email or exporting a PDF, refreshes detail, list, filters and summary counts, and offers Delete only to an Admin viewing a draft

#### Scenario: Editable fields save

- **GIVEN** the user opens Edit invoice in any status
- **WHEN** they change title, group, project, period, services, rate, currency, discount, rounding, From, Bill to, payment details, notes or selected entries
- **THEN** the form previews the resulting charges before saving and permits adding eligible entries or excluding linked entries without changing tracked time

#### Scenario: Save revision

- **GIVEN** the user reviews the edited values and selected entries
- **WHEN** Save changes succeeds
- **THEN** the detail shows the saved revision without a redundant success toast. Reference, audit fields and computed totals cannot be entered manually. Status-only saves preserve unsaved edits

#### Scenario: Override billing defaults

- **GIVEN** an invoice has saved issuer and payment details
- **WHEN** the editor opens
- **THEN** the form starts from its saved values, offers an explicit Use settings action and allows invoice-specific overrides without changing workspace defaults

#### Scenario: Draft status actions

- **GIVEN** an authorized user opens a Draft invoice
- **WHEN** the actions render
- **THEN** Draft is selected and the user can choose Sent or Paid. Only an Admin can delete the draft.

#### Scenario: Sent status actions

- **GIVEN** an authorized user opens a Sent invoice
- **WHEN** the actions render
- **THEN** Sent is selected and the user can choose Draft or Paid.

#### Scenario: Paid status actions

- **GIVEN** an authorized user opens a Paid invoice
- **WHEN** the actions render
- **THEN** Paid is selected and the user can choose Sent or Draft.

#### Scenario: Mark as sent is semantic only

- **GIVEN** the current invoice is a draft
- **WHEN** the user selects Sent
- **THEN** only its recorded status changes; delivery and document download are separate actions.

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

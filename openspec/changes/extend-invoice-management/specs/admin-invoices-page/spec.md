## MODIFIED Requirements

### Requirement: Invoice List Page

The invoices list page MUST display a searchable, filterable table of invoices with stats cards, pagination, and a create action, using only backend-provided data.

#### Scenario: Admin sees the full invoice list

- **GIVEN** an authenticated admin opens the invoices page
- **WHEN** invoice data loads successfully
- **THEN** the page shows a table with columns: Invoice reference and recipient, Project, Period (dateFrom–dateTo), Hours (totalHours), Amount (totalAmount with currency), and a Status badge (draft/sent/paid)
- **AND** each invoice's reference is a link that navigates to the invoice detail page
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
- **AND** clearing filters restores the role-allowed result set in the selected group view

#### Scenario: Pagination controls page navigation

- **GIVEN** the invoice list returns more than one page of results
- **WHEN** the user navigates pages
- **THEN** the page shows a pagination control below the table
- **AND** the current page and total pages are derived from the API `meta` response

#### Scenario: Stats cards display invoice summaries

- **GIVEN** an admin or PM opens the invoices page
- **WHEN** invoice stats load successfully
- **THEN** the page shows three stats cards from `GET /invoices/stats`
- **AND** the "Open Invoices" card shows draft + sent count with a breakdown by draft and sent status
- **AND** the "Billed This Month" card shows the sum of `totalAmount` for invoices created this month with a subtitle identifying scope and currency
- **AND** the "Drafts" card shows the draft count with subtitle "Ready for review"
- **AND** the "Billed This Month" total uses the single currency returned by the API `thisMonth` field (multi-currency approximation note is a future enhancement pending API support for per-currency breakdown)

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

### Requirement: Status Transition Conflict Handling

The detail page MUST preserve the draft while resolving failed edits and status changes.

#### Scenario: Concurrent update conflict

- **GIVEN** an authorized user has unsaved changes
- **WHEN** a save returns invoice_update_conflict
- **THEN** the UI refreshes current saved state, identifies the conflict and retains draft fields for review and retry

#### Scenario: Invalid status transition

- **GIVEN** the status selector displays the three supported statuses
- **WHEN** a user chooses an earlier supported status
- **THEN** the selection succeeds without a backward-transition error; invalid values are unavailable in the selector.

#### Scenario: Selected entry becomes unavailable

- **GIVEN** another invoice has claimed a selected entry
- **WHEN** the save is rejected
- **THEN** the editor preserves the input and checkbox choices, refreshes eligibility, highlights the unavailable entry, and lets the user revise the selection before retrying

### Requirement: Invoice Mobile Responsive Layout

The invoices list page MUST render a mobile-friendly layout below the desktop breakpoint.

#### Scenario: Mobile list renders stacked cards

- **GIVEN** an admin or PM opens the invoices page on a viewport below 640px
- **WHEN** invoice data loads successfully
- **THEN** the table switches to stacked mobile record cards
- **AND** each card shows the same meaningful fields as the desktop row: reference, recipient, project, period, hours, amount, and status badge
- **AND** tapping a card reference navigates to the detail page

#### Scenario: Full workflows on a narrow screen

- **GIVEN** the viewport is below 640px
- **WHEN** the user filters, manages groups, selects invoices, opens a detail or opens a create, edit, duplicate or move dialog
- **THEN** full-width filters, selectable cards and group controls provide the same operations as desktop, including status selection and PDF download
- **AND** dialogs have scrollable bodies, reachable close and primary actions, labeled controls, visible keyboard focus and focus restoration on dismissal

### Requirement: Invoice Surfaces Display Rounded Per-Entry Duration

The invoice detail page time-entries table and the create dialog eligible-entries preview MUST display the rounded billed duration per entry — the `roundedDurationSeconds` value from the response — not the original raw `durationSeconds`. The raw duration is retained in the response payload for transparency but is not the value rendered in the Duration column. The summary displays the saved rounding step.

#### Scenario: Invoice detail time-entries table shows rounded duration

- **GIVEN** an invoice was created with `roundingStepMinutes: 5`
- **AND** a linked time entry has `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the admin or PM opens the invoice detail page
- **THEN** the time-entries table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Create dialog eligible-entries preview shows rounded duration

- **GIVEN** the create dialog preview returns an entry with `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the user reviews the eligible time entries
- **THEN** the preview table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Preview Duration column recalculates when the rounding step changes

- **GIVEN** the create dialog preview shows an entry whose `roundedDurationSeconds` is 600 (10 minutes) under a 5-minute step
- **WHEN** the user changes the `Rounding step` dropdown to 30
- **THEN** the eligible-entries preview re-fetches with `roundingStepMinutes=30`
- **AND** the preview table Duration column for that entry re-renders with the new rounded duration (30 minutes) from the fresh response
- **AND** the previously displayed 10-minute value is no longer rendered

#### Scenario: Rounding step value is not displayed on the invoice detail page

- **GIVEN** the invoice detail has not loaded
- **WHEN** the page displays the loading state
- **THEN** it does not present an assumed rounding step before the invoice snapshot is available

#### Scenario: Rounding step value is displayed on the invoice detail page

- **GIVEN** an invoice has a `roundingStepMinutes` snapshot of 5
- **WHEN** the admin or PM opens the invoice detail page
- **THEN** the summary displays 5 minutes
- **AND** the rounded `totalHours` and the rounded per-entry durations reflect the rounding

#### Scenario: Create dialog estimate rounds the total amount up to the next cent

- **GIVEN** the create dialog preview returns `totalHours: 3.33` and the user enters a rate of $10.01 with a 90% discount
- **WHEN** the dialog renders the live total amount estimate (3.33 x 10.01 x 0.1 = 3.3333)
- **THEN** the estimate displays $3.34 (ceiling to the next cent), matching the authoritative server-side total
- **AND** the estimate never displays a truncated or half-up value such as $3.33

### Requirement: Invoice Defaults Loaded From PM-Accessible Endpoint

The invoices page SHALL load currency, default hourly rate, rounding step, issuer, optional logo and payment defaults from `GET /invoices/defaults` instead of `GET /workspace/settings`. This endpoint is accessible to both admin and PM users, eliminating the 403 Forbidden error previously shown to PMs.

#### Scenario: PM navigates to invoices without 403 toast

- **GIVEN** a PM with `canViewInvoices = true` is authenticated
- **WHEN** the PM navigates to `/invoices`
- **THEN** the page loads invoice defaults from `GET /invoices/defaults`
- **AND** no `GET /workspace/settings` request is made
- **AND** no 403 Forbidden error toast is displayed

#### Scenario: Admin navigates to invoices using defaults endpoint

- **GIVEN** an admin is authenticated
- **WHEN** the admin navigates to `/invoices`
- **THEN** the page loads invoice defaults from `GET /invoices/defaults`
- **AND** the create dialog pre-fills workspace billing defaults from the response

#### Scenario: Invoice defaults load failure shows error

- **GIVEN** the invoices page is loading
- **WHEN** the `GET /invoices/defaults` request fails
- **THEN** an error toast is shown with the failure message
- **AND** the create dialog falls back to null defaults

## ADDED Requirements

### Requirement: Personal invoice organization controls

The invoices page MUST provide flat personal group navigation and single and multiple invoice organization actions.

#### Scenario: Browse and manage groups

- **GIVEN** invoices are available to the current user
- **WHEN** the list opens
- **THEN** All invoices, Ungrouped and named personal groups show authorized counts. Search, status, project, period and pagination operate within the selected view

#### Scenario: Change a group

- **GIVEN** the user opens create or rename
- **WHEN** they enter a blank or duplicate name
- **THEN** inline feedback preserves the entered name. Valid creation and renaming are reflected in navigation without changing invoice data

#### Scenario: Remove a group

- **GIVEN** the user opens Delete group
- **WHEN** the confirmation opens with Cancel focused and the user confirms
- **THEN** the group disappears and its invoices return to Ungrouped for that user and remain in All invoices

#### Scenario: Move selection

- **GIVEN** one or more invoices are selected
- **WHEN** the user chooses Move to group or Remove from group
- **THEN** the user can replace their membership or return the selection to Ungrouped. The move dialog identifies the current group and disables an unchanged destination. Successful moves refresh counts and rows; failed moves retain selection and memberships for retry

#### Scenario: Empty and failure states

- **GIVEN** an active group has search or filters
- **WHEN** its results refresh
- **THEN** loading preserves controls and existing rows during refresh. An empty group offers Create invoice and Browse all invoices; zero matches offer Clear filters; request failure preserves the view and offers Retry

### Requirement: Create from an invoice

The detail MUST offer Create from this invoice in every status.

#### Scenario: Review and create a copy

- **GIVEN** the user opens the action on an accessible invoice
- **WHEN** they choose the new period and personal group and continue
- **THEN** an editable draft form opens with source business values, a fresh eligible-entry preview and no copied billed entries. Cancel discards the draft and preserves the source; submission creates a separate draft with its own reference

### Requirement: Invoice PDF download

The detail MUST offer a PDF download based on saved invoice data in every status.

#### Scenario: Download saved document

- **GIVEN** the user activates Download PDF
- **WHEN** the request is pending
- **THEN** Preparing PDF is shown and repeated activation is disabled. Success downloads the saved document; failure offers Retry download and preserves the detail and group selection

#### Scenario: Complete an older invoice before export

- **GIVEN** a saved invoice lacks required issuer, recipient, service or payment details
- **WHEN** the user chooses Download PDF
- **THEN** the UI identifies the missing details and offers the editor to complete and save them before export

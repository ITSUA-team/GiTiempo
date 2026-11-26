# Admin Invoices Page Specification

## Purpose

Define the admin SPA invoice management surface behavior — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware interactions for Admin and PM users.

## Requirements

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
- **THEN** it shows fields: Title (required), Project (optional), Date range (required), Hourly rate (required, defaults from settings when available), Currency (required, workspace currency options), Discount (optional, default 0), and Notes (optional)
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
- **AND** the Time entry view shows selectable eligible entries with Date, User, Duration and Description, and the Task view groups those eligible entries
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
- **AND** zero entries alone do not block creation; all required document fields and billing inputs must still be valid

#### Scenario: Successful creation

- **GIVEN** the user has filled all required document fields and supplied valid billing inputs
- **WHEN** the user activates `Create invoice`
- **THEN** the page sends a POST request with only contract-supported fields
- **AND** on success the dialog closes and the invoice list refreshes without a redundant success/info notification

#### Scenario: Domain error on missing rate or currency

- **GIVEN** the user submits without an hourly rate or currency and the workspace has no default
- **WHEN** the API returns 422 with `invoice_rate_required` or `invoice_currency_required`
- **THEN** the page shows the API message beside the corresponding rate or currency field
- **AND** the dialog remains open with the user's input preserved

#### Scenario: Domain error on total overflow

- **GIVEN** the computed total amount exceeds the maximum
- **WHEN** the API returns 422 with `invoice_total_overflow`
- **THEN** the page shows the API message beside the corresponding rate or currency field
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
- **THEN** the page shows reference, status selector, personal group, sender, recipient, service description, project, period, rate, currency, rounding, included work in the saved display mode (entry dates, people, descriptions and billed time in Time entry mode, or task names and summed billed time in Task mode), subtotal, discount, total, payment details, notes and audit details

#### Scenario: Change status

- **GIVEN** the detail is open in any status and its saved document is complete and valid
- **WHEN** the user selects Draft, Sent or Paid, including Sent to Draft
- **THEN** the page saves the status without sending email or exporting a PDF, refreshes detail, list, filters and summary counts, and offers Delete only to an Admin viewing a draft

#### Scenario: Editable fields save

- **GIVEN** the user opens Edit invoice in any status
- **WHEN** they change title, group, project, period, services, rate, currency, discount, rounding, From, Bill to, payment details, notes or selected entries
- **THEN** the form requires a complete valid document and previews the resulting charges before saving and permits adding eligible entries or excluding linked entries without changing tracked time

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
- **THEN** Draft is selected and the user can choose Sent or Paid. Only an Admin sees Delete invoice alongside the other header actions for the draft.

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

- **GIVEN** an authorized admin or PM performs a create, update, status change, or delete action
- **WHEN** the action succeeds
- **THEN** the updated visible state or existing navigation communicates success without a redundant success/info notification
- **AND** failures retain actionable error toasts and their existing retry, conflict, and input-preservation behavior

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

### Requirement: Invoice Currency Formatting

The invoices page MUST format all monetary amounts using the API-provided currency code, never hardcoded symbols.

#### Scenario: Currency formatting uses API currency field

- **GIVEN** an invoice has a `currency` field set to any 3-letter ISO 4217 code
- **WHEN** the amount is displayed in the list, detail, or create dialog
- **THEN** the amount is formatted using `Intl.NumberFormat` with the invoice's `currency` field
- **AND** no hardcoded currency symbols are used

### Requirement: Invoice Create Dialog Includes Time Rounding Step

The invoice create dialog MUST use a PrimeVue `<Select>` with minute presets 1, 5, 10, 15, 30 and 60 and no option to disable rounding. Prefill it from the eligible-entries preview. On project changes, update an untouched field immediately from the project's `timeRoundingStepMinutes` or the inherited workspace default, then use the preview response. Per-invoice overrides MUST leave the project's step unchanged.

#### Scenario: Rounding step field is pre-filled from preview

- **GIVEN** the admin or PM has entered both date range bounds and selected a project
- **AND** the eligible-entries preview response returns `defaultRoundingStepMinutes: 5`
- **WHEN** the dialog renders the rounding step field
- **THEN** the field is pre-filled with 5
- **AND** the previewed total hours reflect per-entry rounding with a 5-minute step

#### Scenario: Rounding step field updates when the project selection changes

- **GIVEN** the rounding step field is pre-filled with 5 for the currently selected project
- **AND** the user has not manually edited the rounding step field
- **WHEN** the user selects a different project whose preview response returns `defaultRoundingStepMinutes: 15`
- **THEN** the rounding step field updates to 15
- **AND** the previewed total hours reflect per-entry rounding with a 15-minute step

#### Scenario: Rounding step field updates immediately from the selected project before the preview fires

- **GIVEN** the user has not yet entered a date range (so no preview request has been made)
- **AND** the user has not manually edited the rounding step field
- **WHEN** the user selects a project whose `timeRoundingStepMinutes` is 15
- **THEN** the rounding step field immediately updates to 15
- **AND** no eligible-entries preview request is required for the update
- **AND** when the selected project has `timeRoundingStepMinutes` null (inherit), the field falls back to the workspace's `timeRoundingStepMinutes`

#### Scenario: Rounding step field uses the workspace default for workspace-wide invoices

- **GIVEN** an admin creates a workspace-wide invoice without a project
- **AND** the eligible-entries preview response returns the workspace's `defaultRoundingStepMinutes: 10`
- **WHEN** the dialog renders the rounding step field
- **THEN** the field is pre-filled with 10
- **AND** the previewed total hours reflect per-entry rounding with a 10-minute step

#### Scenario: User override of rounding step updates the preview

- **GIVEN** the rounding step field is pre-filled with 5
- **WHEN** the user changes it to 15
- **THEN** the preview request carries `roundingStepMinutes=15`
- **AND** the previewed total hours reflect per-entry rounding with a 15-minute step

#### Scenario: Rounding step override does not change project settings

- **GIVEN** the user overrides the rounding step from 5 to 15 in the create dialog
- **WHEN** the invoice is created
- **THEN** the invoice's `roundingStepMinutes` snapshot is 15
- **AND** the project's `timeRoundingStepMinutes` remains 5

#### Scenario: Rounding step is included in the create request

- **WHEN** the user submits the create invoice form
- **THEN** the create request body includes a non-null `roundingStepMinutes` value between 1 and 60

#### Scenario: Rounding step uses the same touched-flag pattern as rate and currency

- **GIVEN** the user has manually edited the rounding step field
- **WHEN** a new preview response arrives with a different `defaultRoundingStepMinutes`
- **THEN** the field is not overwritten by the preview default
- **AND** the user's manual value is preserved

### Requirement: Invoice Surfaces Display Rounded Per-Entry Duration

Whenever an editor or detail view displays an individual time entry, including a child row expanded in the editor, it MUST display its billed duration from `roundedDurationSeconds`. The response retains the raw duration. Task rows MUST sum the included entries’ rounded durations. The summary displays the saved rounding step.

#### Scenario: Invoice detail time-entries table shows rounded duration

- **GIVEN** an invoice was created in Time entry mode with `roundingStepMinutes: 5`
- **AND** a linked time entry has `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the admin or PM opens the invoice detail page
- **THEN** the time-entries table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Create dialog eligible-entries preview shows rounded duration

- **GIVEN** the create dialog preview returns an entry with `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the user reviews the individual eligible time entries
- **THEN** the preview table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Preview Duration column recalculates when the rounding step changes

- **GIVEN** the create dialog preview displays an individual entry whose `roundedDurationSeconds` is 600 (10 minutes) under a 5-minute step
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
- **AND** the draft starts with the source logo if present, otherwise with the current workspace logo if configured. The user can replace or remove the logo before saving.
- **AND** successful submission opens the newly created invoice's detail page.

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

### Requirement: Invoice issue and payment dates

The editor SHALL expose an editable Issue date followed by an optional Due date, separately from the billing period. Details and PDF SHALL show the saved issue date and the due date when set.

#### Scenario: Create, edit and copy dates

- **WHEN** a user opens a new invoice or creates one from an existing invoice
- **THEN** Issue date starts at the browser-local calendar date today and Due date starts empty, independently of the source invoice's absolute dates
- **WHEN** a saved invoice is edited
- **THEN** its dates are restored, retained through request failure and revision review, and saved with the reviewed business changes
- **AND** an older invoice uses its persisted issue date or creation-date fallback and does not receive an invented due date

#### Scenario: Validate the payment deadline

- **WHEN** Due date precedes Issue date
- **THEN** saving is rejected with an actionable error while preserving both inputs
- **AND** clearing Due date explicitly removes the deadline

### Requirement: Payment method specific fields

Invoice editors SHALL adapt payment fields to the selected method. Bank transfer SHALL require beneficiary, bank and account or IBAN, with optional SWIFT/BIC. Card SHALL require provider and an HTTPS payment link. Other and custom methods SHALL require their method name and Payment details, with optional beneficiary and provider. Terms and instructions SHALL remain available for every method.

#### Scenario: Switch payment methods without losing edits

- **WHEN** the user switches from Bank transfer to Card
- **THEN** bank-specific inputs are replaced by provider and payment link inputs
- **AND** switching back restores the locally entered fields hidden by the other method, including beneficiary, account and SWIFT/BIC
- **AND** saved details and exported PDF include the selected method's applicable fields
- **AND** provider, terms and instructions are shared values across methods, while paymentUrl is a Card-only input and output
- **AND** Card never requests card numbers, expiry or CVV

#### Scenario: Preserve custom payment methods

- **WHEN** an older invoice or a user-entered method is outside Bank transfer and Card
- **THEN** the editor preserves its name and generic payment details without converting it to a built-in method

### Requirement: Choose time display in the invoice editor

Create and Edit SHALL place a labeled **Show time by** selector with **Time entry** and **Task** above the entry selection on desktop and mobile. Both views SHALL edit the same set of selected entry IDs. In Task mode users SHALL be able to expand each task, inspect its individual entries, and include or exclude any entry.

#### Scenario: Start a new invoice or use an existing one

- **WHEN** a user opens a new invoice, edits a saved invoice, or creates from another invoice
- **THEN** the editor selects Time entry for a new invoice and uses the resolved saved mode for edit or copy
- **AND** users can change the mode before saving

#### Scenario: Review a partial task and switch views

- **GIVEN** two 6-minute entries on one task use a 15-minute rounding step
- **WHEN** both are selected in Task mode
- **THEN** the task shows 2 of 2 included and 30 billed minutes
- **WHEN** the user expands it, excludes one entry and switches between views
- **THEN** the same entry stays excluded and the task shows 1 of 2 included and 15 billed minutes
- **AND** both views show identical invoice totals for that selection

#### Scenario: Select entries from an expanded task on desktop

- **GIVEN** an expanded task has both included and excluded entries
- **WHEN** the user activates its mixed-state header checkbox
- **THEN** all entries in that task become included and entries in every other task retain their selection
- **AND** clearing the checked header excludes only entries in that task

#### Scenario: Keep excluded entries reachable

- **WHEN** the user excludes every entry on a task
- **THEN** its editor group remains expandable with zero included time so the user can restore entries
- **AND** when every task is excluded the editor shows zero selected entries and zero charges and permits saving an empty invoice

### Requirement: Render the saved time format on invoice details

Invoice details SHALL show the saved format on desktop and mobile. In Task mode details SHALL show one row per included task with its saved name and summed billed duration, omitting individual entries’ people, dates and descriptions.

#### Scenario: Reopen a saved invoice

- **WHEN** an invoice saved in Task mode contains two entries on the same task from different people
- **THEN** both screen sizes show one task row with their combined billed duration
- **AND** tasks with zero included entries are absent

#### Scenario: View an empty task-mode invoice

- **WHEN** a saved invoice in Task mode has no included entries
- **THEN** details show an empty work section and zero totals

### Requirement: Complete invoice document form

The create, edit and create-from editor SHALL apply the same complete-document rules for Draft, Sent and Paid. It SHALL require title, both parties' names, addresses and emails, services, Issue date, billing period, rate and currency, plus the selected method's required payment fields. Existing PM project requirements SHALL continue to apply.

#### Scenario: Missing or whitespace-only required fields

- **GIVEN** a user has entered incomplete From, Bill to, services or payment details in any editor mode
- **WHEN** the user activates the primary save action
- **THEN** no save request is sent and every missing required field is identified inline, including whitespace-only values
- **AND** the form retains all input and entry selections for correction

#### Scenario: Optional fields remain optional

- **GIVEN** all required document fields are valid
- **WHEN** Tax ID, SWIFT/BIC, Due date, payment terms, notes or logo are absent
- **THEN** saving is permitted, subject to existing billing and access rules
- **AND** optional values supplied by the user must satisfy their existing format, length, date and logo constraints
- **AND** Payment instructions remain optional for every method; the existing Payment details field is required for Other/custom methods

#### Scenario: Validate field values and cross-field constraints

- **GIVEN** an editor contains a malformed email, non-HTTPS Card link, overlong text, invalid calendar date, reversed billing period, Due date before Issue date, or a numeric value outside existing billing limits
- **WHEN** the user attempts to save
- **THEN** each invalid field shows an actionable error and saving is blocked until it is corrected
- **AND** empty Issue date is invalid even though new invoices normally prefill today's date
- **AND** zero rate remains valid under existing nonnegative-rate rules

#### Scenario: Empty work selection is a complete invoice

- **GIVEN** the document fields are complete and valid and there are no selected entries
- **WHEN** the user saves in Time entry or Task mode
- **THEN** the invoice is saved with zero hours and zero totals, without requiring a work entry

### Requirement: Required indicators and accessible invoice errors

Invoice forms SHALL mark required controls with an asterisk and accessible required semantics. Labels SHALL omit “optional” suffixes. Invalid controls SHALL have visible error styling, an accessible invalid state and an associated inline explanation. Errors SHALL clear independently as the corresponding values become valid.

#### Scenario: Required indicators follow the active payment method

- **GIVEN** the user opens create, edit or create-from
- **WHEN** the user switches between Bank transfer, Card and Other/custom methods
- **THEN** required indicators follow the currently applicable payment requirements, and optional fields have no required indicator
- **AND** no optional label suffix is shown
- **AND** partial workspace defaults are not presented as an error before the user attempts to save the invoice

#### Scenario: Submit and correct several invalid controls

- **GIVEN** several controls are invalid, including Issue date
- **WHEN** the user attempts to save
- **THEN** all errors become visible, the first invalid control is brought into view and receives focus, and invalid dates have a visible input border and associated message
- **WHEN** one field is corrected
- **THEN** only its resolved error clears and the remaining errors stay visible
- **AND** purely local validation does not produce a generic failure toast

#### Scenario: Server validation preserves correction context

- **GIVEN** a save is rejected with field-addressed document validation errors
- **WHEN** the response is displayed
- **THEN** each error is shown beside the corresponding control while the dialog, values and selected entries remain available for correction

#### Scenario: Invalid hidden payment edits remain correctable

- **GIVEN** the user enters an invalid Card URL then switches to Bank transfer and supplies complete bank details
- **WHEN** the user switches back to Card before saving
- **THEN** the entered URL is restored and must be corrected before a Card save
- **WHEN** the user returns to complete Bank transfer details and saves
- **THEN** the inactive local Card URL is omitted from the submitted applicable payment fields and does not block saving

### Requirement: Invoice editor follows PDF document order

The editor SHALL follow the PDF's semantic reading order on desktop and mobile: document dates and period, From, Bill to, services and project, work lines and pricing, totals, How to pay, then Notes. Non-PDF controls SHALL be secondary to their related section. Repeated PDF header/footer values SHALL have one editable source.

#### Scenario: Read and navigate the form in document order

- **GIVEN** a create, edit or create-from editor is open on desktop or mobile
- **WHEN** the user reads or tabs through document fields
- **THEN** Issue date precedes Due date and billing period; From precedes Bill to; both precede services and project; work selection and rate/currency precede discount and computed total; payment follows totals and notes follow payment
- **AND** within each party, name precedes address, email and Tax ID
- **AND** the generated invoice reference is read-only when available and is never manually required on creation
- **AND** title and personal group are clearly secondary invoice-management controls; time display and rounding controls remain beside the work/pricing section
- **AND** the layout does not imitate page-break-dependent PDF totals placement

#### Scenario: Payment controls follow their document block

- **GIVEN** the How to pay section is visible
- **WHEN** the user reads or tabs through its applicable controls
- **THEN** method and terms precede beneficiary/provider/account for Bank transfer or Other/custom, or provider/payment link for Card; Bank transfer SWIFT/BIC follows account; optional Payment instructions are last

### Requirement: One strict save path and historical correction

The editor SHALL offer one primary save action and no Save as Draft action. New invoices SHALL be created as Draft; existing status selection SHALL remain separate. Historical incomplete invoices SHALL remain viewable and openable for correction, but SHALL require completion before a document save or status update.

#### Scenario: Create and edit use the same completeness rules

- **GIVEN** a valid complete form
- **WHEN** the user saves a new invoice or creates one from a source
- **THEN** a new Draft is saved with its own reference
- **WHEN** the user saves an existing invoice
- **THEN** its current status is preserved unless explicitly changed through the separate status action
- **AND** Draft never bypasses validation

#### Scenario: Correct a historical invoice before changing status

- **GIVEN** an accessible saved invoice has incomplete document fields
- **WHEN** the user opens it or opens its editor
- **THEN** existing information is displayed without invented business data
- **WHEN** the user attempts a document save or status change
- **THEN** the action is blocked with specific missing/invalid fields and a path to edit them, and the saved status is preserved
- **AND** completing and saving the document makes the separate status action available under normal access and revision rules

#### Scenario: Copy an incomplete historical source

- **GIVEN** an accessible historical invoice is incomplete
- **WHEN** the user creates from it
- **THEN** the source values are available for review, but saving the new Draft requires all document fields to be complete and valid
- **AND** the source remains unchanged

#### Scenario: Organization and deletion remain available

- **GIVEN** a historical invoice is incomplete
- **WHEN** an authorized user changes its personal group through organization controls or an Admin deletes an eligible Draft
- **THEN** existing organization and deletion rules apply without requiring document completion

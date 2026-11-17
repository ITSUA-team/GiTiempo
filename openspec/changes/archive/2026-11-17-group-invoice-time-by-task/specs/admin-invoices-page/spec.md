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
- **THEN** the page shows reference, status selector, personal group, sender, recipient, service description, project, period, rate, currency, rounding, included work in the saved display mode (entry dates, people, descriptions and billed time in Time entry mode, or task names and summed billed time in Task mode), subtotal, discount, total, payment details, notes and audit details

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

## ADDED Requirements

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

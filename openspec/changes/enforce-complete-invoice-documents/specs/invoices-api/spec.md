# Spec Delta

## ADDED Requirements

### Requirement: Complete resolved invoice document

Every saved invoice revision SHALL have complete valid document fields regardless of status. Required fields SHALL include title, sender and recipient names, addresses and emails, services, Issue date, both billing-period bounds, rate, currency and applicable payment details. Required text SHALL be nonempty after trimming. Existing access, numeric, date, length, logo and selection constraints SHALL apply.

#### Scenario: Required parties and services cannot be empty

- **GIVEN** an authorized caller submits an invoice write in Draft, Sent or Paid
- **WHEN** the resolved document lacks either party, either party's name/address/email, or services, including whitespace-only required text
- **THEN** the API rejects the write with field-addressed validation errors
- **AND** the invoice, revision, totals, selected-entry links and group membership are unchanged

#### Scenario: Validate values and optional fields

- **GIVEN** a resolved candidate document
- **WHEN** an email is malformed, a supplied value exceeds its length limit, a date is invalid, a billing period is reversed, Due date precedes Issue date, a numeric billing input violates existing limits, or a supplied logo is invalid
- **THEN** the API rejects it using the existing validation/error envelope and identifies the offending fields
- **AND** currency retains existing three-letter normalization/format rules and rate retains existing nonnegative precision and limits, including zero
- **AND** Tax ID, SWIFT/BIC, Due date, payment terms, notes and logo remain optional, without adding country-specific tax or bank-account verification

#### Scenario: Complete invoices may have no selected work

- **GIVEN** all required document fields and billing inputs are valid
- **WHEN** no eligible entries exist or an explicit selection is empty
- **THEN** creation and revision remain valid with zero hours and zero totals in either display mode

### Requirement: Applicable payment completeness

Every invoice write SHALL require a nonblank payment method. Bank transfer SHALL require beneficiary, bank and account/IBAN. Card SHALL require provider and a valid HTTPS payment URL. Other/custom methods SHALL require Payment details and preserve their method name. Completeness SHALL depend only on the active method's fields.

#### Scenario: Validate Bank transfer and Card requirements

- **GIVEN** a complete candidate except for payment
- **WHEN** Bank transfer lacks beneficiary, provider/bank or account, or Card lacks provider or payment URL
- **THEN** the API rejects the write and identifies each missing field
- **AND** a Card URL with a non-HTTPS scheme or invalid URL syntax is rejected
- **AND** SWIFT/BIC is optional for Bank transfer and instructions are optional for every method

#### Scenario: Validate Other and custom methods

- **GIVEN** Other or a nonblank custom method is selected
- **WHEN** Payment details are empty or whitespace-only
- **THEN** the API rejects the write at the existing Payment details field (`payment.account`)
- **WHEN** valid Payment details are supplied
- **THEN** beneficiary, provider and instructions may remain empty and the custom method is not renamed

#### Scenario: Inactive fields do not invalidate an applicable document

- **GIVEN** Card has complete valid provider and HTTPS payment URL but no bank fields, or Bank transfer has complete bank fields but no Card URL
- **WHEN** the invoice is saved
- **THEN** missing inactive fields do not block saving
- **AND** inactive payment fields are excluded from the active saved document projection and PDF

#### Scenario: Direct payloads retain structural validation

- **GIVEN** a direct API payload supplies a malformed or incorrectly typed inactive payment value
- **WHEN** the request is validated
- **THEN** existing structural/type/format validation can reject it before document projection
- **AND** completeness does not require inactive values to be supplied; clients omit inactive malformed local edits

### Requirement: Resolve invoice candidates before mutation

Creation SHALL validate the final document after supported defaults are resolved. PATCH SHALL validate the saved document merged with supplied changes, rather than requiring every field in the request. Validation SHALL precede document, entry-link and group writes. Unsupported or invalid input SHALL not bypass validation through defaults or a status-only path.

#### Scenario: Use valid defaults on creation

- **GIVEN** the caller omits sender, payment, rate, currency or Issue date and supported defaults supply valid values
- **WHEN** the resolved document is otherwise complete
- **THEN** creation succeeds with those resolved values
- **AND** an explicit empty or invalid override is rejected rather than replaced with a default
- **AND** existing rate/currency-required domain errors remain compatible when neither input nor defaults supply them

#### Scenario: Validate a merged partial update

- **GIVEN** a complete saved invoice and a current revision
- **WHEN** a valid partial update omits unchanged required fields
- **THEN** the API retains those saved values and accepts the complete merged document
- **WHEN** a partial update empties or clears a required field
- **THEN** it is rejected without any mutation

#### Scenario: Complete a historical invoice in one revision

- **GIVEN** an incomplete historical invoice
- **WHEN** a caller supplies all missing/invalid fields in one otherwise valid update
- **THEN** the complete merged document is saved atomically, preserving omitted saved business values
- **AND** current workspace defaults do not silently replace historical saved values

#### Scenario: Status updates cannot bypass completeness

- **GIVEN** an incomplete historical invoice in any supported status
- **WHEN** a caller submits a status-only update, including the already saved status, or an unrelated document field update
- **THEN** the API rejects it with actionable document errors and leaves the saved revision and status unchanged
- **AND** the existing authorization and stale-revision checks still apply

#### Scenario: Retain atomicity and conflict handling

- **GIVEN** a write changes entries or personal group together with document fields
- **WHEN** completeness fails, eligibility fails or a concurrent revision/entry claim wins
- **THEN** no invoice field, total, link or group mutation from the rejected write is committed
- **AND** stale revisions and conflicting entry claims retain their existing conflict behavior

### Requirement: Compatible historical reads defaults and previews

Stricter document writes SHALL preserve authorized reads of historical invoices, partial workspace billing defaults and calculation previews while a form is incomplete. No business details SHALL be fabricated or backfilled to satisfy completeness. Standalone personal organization and existing deletion rules SHALL remain independent of document completeness.

#### Scenario: Read incomplete historical data

- **GIVEN** an accessible historical invoice lacks document fields
- **WHEN** it is listed or read, or opened as a create-from source
- **THEN** its available data is returned without enforcing new write completeness or inventing missing party/payment details

#### Scenario: Keep partial workspace defaults

- **GIVEN** an Admin configures only part of the sender or payment defaults
- **WHEN** settings are saved and authorized callers retrieve invoice defaults
- **THEN** partial defaults remain accepted and readable under existing settings rules
- **AND** they do not make an incomplete invoice eligible for saving

#### Scenario: Preview calculations during document entry

- **GIVEN** a user has supplied valid billing scope and calculation inputs but has not filled party, services or payment fields
- **WHEN** the user requests eligible entries or a billing revision preview
- **THEN** preview works under existing authorization, eligibility and arithmetic rules without requiring complete document fields or writing data

#### Scenario: Organize or delete without completing document fields

- **GIVEN** a historical invoice is incomplete
- **WHEN** a user performs a permitted standalone personal group move or an Admin deletes an eligible Draft
- **THEN** existing organization/deletion behavior succeeds independently of document completeness

## MODIFIED Requirements

### Requirement: Invoice Can Be Created From Eligible Time Entries

The backend MUST expose a protected `POST /invoices` endpoint for `admin` and `pm` users that creates an invoice from a validated body containing a title, billing date range, optional project scope, hourly rate, optional discount, optional notes, and an optional `roundingStepMinutes` (positive integer between 1 and 60). Rounding is always active — there is no no-rounding option — so the invoice's `roundingStepMinutes` snapshot MUST always be a positive integer between 1 and 60 and MUST never be null. When `roundingStepMinutes` is supplied, the backend MUST use that value as the snapshot. When it is omitted, the backend MUST resolve the snapshot from the scoped project's effective rounding step — the project's own `timeRoundingStepMinutes` when set, otherwise the workspace's `timeRoundingStepMinutes` — and for workspace-wide invoices from the workspace's `timeRoundingStepMinutes`. PMs must also have `canViewInvoices = true` to access the endpoint. Creation MUST satisfy the complete resolved invoice document requirements, including when the selected entries are empty.

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

- **GIVEN** several entries are eligible and all resolved document fields are complete and valid
- **WHEN** an authorized caller creates an invoice with an explicit selection
- **THEN** the API bills exactly those entries, including zero entries and zero totals for an empty selection, and assigns a new reference and draft status.

#### Scenario: Resolve invoice-specific business details

- **GIVEN** workspace invoice defaults exist
- **WHEN** the caller creates an invoice with individual overrides
- **THEN** the saved invoice contains the complete, validated resolved sender, optional logo, payment details, recipient and service description; later default changes do not affect it.

### Requirement: Invoice Revisions And Status Selection

The protected PATCH /invoices/:id MUST allow Admins and PMs with invoice access to change status, title, project/scope, billing period, hourly rate, currency, discount, rounding, sender, recipient, services, payment instructions, notes and selected entries in every status. A change of status alone MUST have no email, export or billing side effects. Server-assigned identity, audit fields and totals MUST remain server-controlled. Every update MUST satisfy complete-document validation against the resolved merged revision, including status-only and otherwise unchanged-status requests.

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

- **GIVEN** an authorized user opens a complete valid sent or paid invoice
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

### Requirement: Download Saved Invoice PDF

The backend MUST offer an authorized PDF download from a consistent saved invoice revision, with the same workspace, role and project access as reading the invoice detail. Export MUST use the same complete-document validity rules as saving.

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

- **GIVEN** a legacy invoice lacks or violates any required document field
- **WHEN** an authorized caller requests its PDF
- **THEN** the API rejects export with actionable field errors before producing document bytes; reading and opening the editor remain available, but document saves and status updates require completion.

### Requirement: Persist and export invoice dates and applicable payment details

The API SHALL persist issueDate and nullable dueDate in the invoice revision. Date changes SHALL use the existing revision and authorization checks. PDF export SHALL use saved dates and the selected method's payment details.

#### Scenario: Export the revised document

- **WHEN** an authorized user exports an invoice with dates and Card payment details
- **THEN** the PDF includes Issue date, Due date when set, provider, instructions and the required clickable HTTPS payment link
- **AND** bank-only details retained in the saved object are excluded from Card output

#### Scenario: Preserve a historical invoice

- **WHEN** an older invoice is migrated or exported
- **THEN** its issue date is derived deterministically from creation in the workspace timezone, its due date remains null, and existing financial totals and linked entries are preserved

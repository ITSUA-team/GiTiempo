# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

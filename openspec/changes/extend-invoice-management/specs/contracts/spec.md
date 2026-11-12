## MODIFIED Requirements

### Requirement: Shared Invoice Create Contract

The shared contracts SHALL define a validated invoice create request body with a title, billing date range, optional project id, hourly rate, optional currency, optional discount percent, optional notes, and an optional `roundingStepMinutes` positive integer (1–60), rejecting any property outside the contract. When `roundingStepMinutes` is omitted, the backend resolves the snapshot default; the contract never accepts null for `roundingStepMinutes`.

#### Scenario: Create request uses shared schema

- **GIVEN** an admin or PM creates an invoice
- **WHEN** the request body is validated
- **THEN** the title, date range, and rate requirements are enforced
- **AND** the discount percent is constrained to the 0–100 range with a step of 0.01
- **AND** `roundingStepMinutes` is constrained to a positive integer between 1 and 60 when present
- **AND** `roundingStepMinutes` is rejected when null

#### Scenario: Unknown property is rejected

- **GIVEN** a create request carries a property outside the contract
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

#### Scenario: Reviewed selection and business details

- **GIVEN** the caller prepares a new invoice or a draft based on another invoice
- **WHEN** the create request is validated
- **THEN** it accepts sender and recipient identification, contact and optional tax details, optional issuer logo, services, payment method, terms, beneficiary, bank/provider, account details, instructions, and an optional personal group
- **AND** an omitted entry selection retains automatic eligible-entry selection, an explicit empty array selects zero, and an explicit list selects only those distinct entry IDs
- **AND** the caller cannot set a persisted reference, original invoice identity, initial status, audit data or calculated totals

### Requirement: Shared Invoice Update Contract

The shared contracts SHALL accept a nonempty partial revision of business fields, status, and included entry IDs for invoices in every status. All supplied values MUST follow the corresponding create-field constraints, and the resulting date range MUST be valid. Unknown fields, direct writes to calculated totals, invoice identity, reference and audit timestamps MUST be rejected.

#### Scenario: Update request uses shared schema

- **GIVEN** a saved Sent invoice with linked entries
- **WHEN** the caller submits only status Draft
- **THEN** the request is valid and leaves billing fields and selected entries intact

#### Scenario: Change the billing snapshot

- **GIVEN** an invoice in any supported status
- **WHEN** a caller changes billing scope, period, rate, currency, discount, rounding, title, notes, sender, recipient, services, payment instructions or entry selection
- **THEN** the contract accepts the supplied editable fields, including a positive integer rounding step from 1 to 60 and an optional personal group selection for this user
- **AND** explicit entry IDs replace the selection, an empty array clears it, and omission retains the current set if eligible under the revised scope
- **AND** a revised scope that makes retained entries ineligible requires the caller to review the selection before saving

#### Scenario: Snapshot totals are not directly mutable

- **GIVEN** an otherwise valid update request
- **WHEN** it supplies a calculated total or a new invoice reference
- **THEN** validation rejects the request

### Requirement: Shared Invoice List Query Contract

The shared contracts SHALL define a validated invoice list query with pagination and optional filters by project, status, date range, search text, and a personal group view, rejecting any property outside the contract.

#### Scenario: List query uses shared schema

- **GIVEN** an admin or PM lists invoices
- **WHEN** the query parameters are validated
- **THEN** pagination (page, limit), project, status, date range, and search filters are enforced
- **AND** the search text is constrained to a maximum of 200 characters

#### Scenario: Unknown query property is rejected

- **GIVEN** a list query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

#### Scenario: Personal group filter composes with list filters

- **GIVEN** the user selects All, Ungrouped or one personal group
- **WHEN** the caller supplies pagination, search, status, date or project filters
- **THEN** the query can express that combination and omission of a group filter selects All

### Requirement: Shared Invoice Response Contract

The shared contracts SHALL define stable invoice list and detail response shapes that include snapshot fields, status, billing date range, optional project summary, the non-null `roundingStepMinutes` snapshot, and the count of linked time entries. The detail response additionally includes the full array of linked time-entry summaries. Each time-entry summary SHALL include both the original raw `durationSeconds` and a `roundedDurationSeconds` positive integer computed with the invoice's `roundingStepMinutes` snapshot, so consumers can display the rounded billed duration per entry without recomputing it.

#### Scenario: Invoice list response uses shared schema

- **GIVEN** the backend returns a list of invoices
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice list response contract
- **AND** includes pagination metadata
- **AND** each item includes snapshot fields, the non-null `roundingStepMinutes`, status, billing date range, optional project summary, and `timeEntryCount`
- **AND** list items do NOT include the `timeEntries` array

#### Scenario: Invoice detail response uses shared schema

- **GIVEN** the backend returns a single invoice
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice detail response contract
- **AND** includes snapshot `hourlyRate`, `currency`, `totalHours`, `totalAmount`, and the non-null `roundingStepMinutes`
- **AND** includes the linked time entries as an array of summaries
- **AND** each entry summary includes `durationSeconds` (raw) and `roundedDurationSeconds` (ceiling-rounded with the invoice snapshot step)

#### Scenario: Read invoice business snapshots

- **GIVEN** the caller retrieves an accessible saved invoice
- **WHEN** the detail response is decoded
- **THEN** it includes a stable invoice reference, saved sender and recipient, service description, payment data, optional logo, and amounts sufficient to display subtotal, discount and final total
- **AND** older invoices can represent unavailable historical details as missing values without substituting current workspace defaults
- **AND** list items expose the reference and recipient display information for the invoice list

### Requirement: Shared Eligible Entries Query Contract

The shared contracts SHALL define a validated eligible-entries query with a required date range, optional project id, optional current invoice context, and an optional `roundingStepMinutes` positive integer (1–60), rejecting any property outside the contract and any reversed date bounds.

#### Scenario: Eligible entries query uses shared schema

- **GIVEN** an admin or PM previews eligible entries
- **WHEN** the query parameters are validated
- **THEN** `dateFrom` and `dateTo` are required, `projectId` is optional, and `roundingStepMinutes` is an optional integer between 1 and 60
- **AND** `dateTo` earlier than `dateFrom` is rejected

#### Scenario: Unknown query property is rejected

- **GIVEN** an eligible-entries query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

#### Scenario: Preview entries while editing an existing invoice

- **GIVEN** an authorized caller edits an invoice
- **WHEN** it provides the invoice context with the candidate scope and dates
- **THEN** the validated preview can identify the current invoice so its own selected entries can remain available

## ADDED Requirements

### Requirement: Invoice billing defaults contracts

Shared contracts MUST distinguish the Admin-managed workspace billing profile from the invoice defaults projection available to authorized invoice users. The Admin profile includes the prefix used for newly issued references. The projection MUST include rate, currency, rounding and reusable sender and payment information, with optional tax details and logo.

#### Scenario: Use partially configured defaults

- **GIVEN** a workspace has configured a sender and has no logo
- **WHEN** an authorized PM reads invoice defaults
- **THEN** the invoice defaults shape supplies the sender and represents the absent logo without requiring Admin Settings access

### Requirement: Personal invoice organization contracts

Shared contracts MUST describe group create, rename, deletion, group counts, and assignment of one or more distinct invoice IDs to one group or Ungrouped. The authenticated context determines ownership and workspace. Built-in views MUST be distinguishable from custom group IDs.

#### Scenario: Bulk move to Ungrouped

- **GIVEN** the caller selects several invoices
- **WHEN** the client submits their IDs and the Ungrouped destination
- **THEN** the contract represents a single move with no business-field updates

#### Scenario: List personal views

- **GIVEN** a signed-in invoice user
- **WHEN** the groups response is decoded
- **THEN** All invoices, Ungrouped and named personal groups each have an accessible-invoice count

### Requirement: Saved invoice PDF response

The export contract MUST return downloadable PDF bytes with the PDF media type and a filename identifying the saved invoice.

#### Scenario: Export a saved invoice

- **GIVEN** an authorized caller requests a saved invoice PDF
- **WHEN** the download succeeds
- **THEN** the response has media type `application/pdf` and an attachment filename containing the invoice reference

#### Scenario: Historical invoice lacks customer-facing details

- **GIVEN** a historical invoice has missing required billing sections
- **WHEN** an authorized caller requests its PDF
- **THEN** a structured validation response identifies the sections to complete before download
- **AND** the client can distinguish this case from a retryable rendering failure

### Requirement: Preview and commit a reviewed invoice revision

The shared contracts SHALL represent a read-only calculation request with candidate billing inputs, scope, period, explicit entry selection and optional editor invoice ID. A new editor SHALL submit the last-read business revision as a precondition when saving an edit or status change.

#### Scenario: Preview selected charges

- **GIVEN** the caller edits rate, rounding or the selected entries
- **WHEN** the preview is requested
- **THEN** its result identifies the candidate selection, rounded hours, currency, subtotal, discount and final total, or identifies an eligibility conflict

#### Scenario: Concurrent business edit

- **GIVEN** the detail response identifies the saved revision
- **WHEN** a new editor submits that revision after a different business edit has been committed
- **THEN** the API reports a conflict and the caller can read the current revision before resubmitting

## ADDED Requirements

### Requirement: Invoice date and payment contracts

Invoice requests SHALL accept date-only issueDate and nullable dueDate. Omitted issueDate on create SHALL resolve to today in the workspace timezone, and omitted dueDate SHALL resolve to null. Update requests SHALL preserve omitted values and clear an explicitly null dueDate. Payment contracts SHALL add optional swift and paymentUrl while preserving existing payment payloads.

#### Scenario: Validate dates and links

- **WHEN** create or update supplies invalid calendar dates or an unsafe non-HTTPS paymentUrl
- **THEN** validation rejects the request
- **AND** a dueDate earlier than the effective issueDate is rejected, including partial updates with only one date

#### Scenario: Accept older callers

- **WHEN** an existing caller omits the new dates or payment fields
- **THEN** its request remains valid and existing payment details remain available

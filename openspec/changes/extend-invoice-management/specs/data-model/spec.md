## MODIFIED Requirements

### Requirement: Invoice Records Are Stored

The backend data model MUST persist workspace-owned invoice records with a title, status, billing date range, snapshot hourly rate, snapshot currency, optional discount, snapshot total hours, snapshot total amount, a non-null snapshot rounding step, optional notes, the creating user, and timestamps.

#### Scenario: Invoice row stores snapshot fields

- **GIVEN** an invoice is created from a set of time entries
- **WHEN** the backend persists the invoice row
- **THEN** the row stores `workspace_id`, optional `project_id`, `title`, `status`, `date_from`, `date_to`, `hourly_rate`, `currency`, `discount_percent`, `total_hours`, `total_amount`, `rounding_step_minutes`, `notes`, `created_by`, and timestamps
- **AND** `status` is one of `draft`, `sent`, or `paid`
- **AND** `rounding_step_minutes` is a non-null integer between 1 and 60 inclusive with a column default of 1

#### Scenario: Invoice status is constrained

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice status
- **THEN** the status is one of `draft`, `sent`, or `paid`

#### Scenario: Invoice is workspace-scoped

- **GIVEN** an invoice row is stored
- **WHEN** the backend records the invoice
- **THEN** the row references a non-null `workspace_id`
- **AND** the workspace owns the invoice

#### Scenario: Existing invoices are backfilled with 1

- **GIVEN** existing invoice rows predate the `rounding_step_minutes` column
- **WHEN** the rounding-step migration is applied
- **THEN** existing invoice rows receive `rounding_step_minutes: 1`

#### Scenario: Preserve the saved document

- **GIVEN** two invoices are created concurrently in one workspace
- **WHEN** they are persisted
- **THEN** each has a distinct stable reference and its own saved party, optional logo, services, payment and line-item data sufficient to reproduce its saved charges independently of workspace defaults.

#### Scenario: Migrate older invoices

- **GIVEN** existing invoices predate references and party details
- **WHEN** the migration runs
- **THEN** each receives a unique stable reference while existing status, links, scope, amounts and audit history survive; unknown historical billing details remain unset instead of being fabricated from current defaults.

## ADDED Requirements

### Requirement: Personal Invoice Organization Storage

The data model MUST persist flat groups per workspace and owner and at most one membership per workspace, owner and invoice. Membership MUST reference a group of that owner in that workspace.

#### Scenario: Delete a personal group

- **GIVEN** two users independently organize the same invoice
- **WHEN** one deletes their group
- **THEN** only its membership rows are removed, preserving the invoice, billed entries and the other user’s organization.

### Requirement: Workspace Invoice Billing Profile

The system MUST store the workspace invoice reference prefix, sender identity and contact details, optional legal and logo information, and default payment method, terms, beneficiary, provider, account details and instructions.

#### Scenario: Update workspace defaults

- **GIVEN** an invoice captured a billing profile
- **WHEN** an administrator changes its payment instructions or logo
- **THEN** the new workspace profile persists independently and the earlier invoice retains its saved values.

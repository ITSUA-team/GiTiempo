## MODIFIED Requirements

### Requirement: Invoice Creation Workflow
The invoices page SHALL provide invoice creation through a modal workflow opened from the invoices table header.

#### Scenario: Create invoice from table-header icon action

- **GIVEN** a user opens the invoices page
- **WHEN** the invoices table header renders
- **THEN** an icon-only primary action sits next to the table search control
- **AND** the action exposes tooltip and accessible label copy `Create invoice`
- **AND** activating the action opens the invoice creation dialog.

#### Scenario: Create invoice from dialog

- GIVEN a user opens the invoice creation flow
- WHEN the dialog is rendered
- THEN the dialog exposes project, date range, rate, discount, and total amount inputs
- AND the dialog submit action copy remains unchanged.

### Requirement: Administrative Management Pages
The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows stat cards covering active members, pending invites, and assigned PMs
- AND it shows a members table with member identity, role, project assignment count, last activity, and page-owned row intents
- AND the members table header exposes a search control plus a primary icon-only `Invite member` action with explicit tooltip and accessible label copy `Invite member`
- AND it exposes page-owned inline PM assignment only for non-admin member rows
- AND it exposes page-owned inline edit and confirmed removal flows triggered by table intents.

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout
- AND the form includes workspace name, currency, default hourly rate, and time zone fields
- AND the time zone field is an editable selector populated with contract-valid time-zone options, including `UTC` and IANA time-zone names, the current persisted time-zone value, and the current draft/form time-zone value
- AND save actions remain discoverable at section level or page bottom.

#### Scenario: Workspace settings time zone save

- GIVEN an admin changes the Settings page time zone to a contract-valid time-zone value
- WHEN the admin saves settings
- THEN the page submits the changed `timeZone` through the existing workspace settings update boundary
- AND the saved form reconciles from the authoritative workspace settings response
- AND unchanged workspace settings fields are not sent only to satisfy schemas.

#### Scenario: Workspace settings time zone validation

- GIVEN an invalid time-zone value is represented in the Settings form state
- WHEN the admin attempts to save settings
- THEN the page shows field-level validation feedback for Time zone
- AND no workspace settings update request is sent.

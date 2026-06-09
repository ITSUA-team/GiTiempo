## MODIFIED Requirements

### Requirement: Invoice Creation Workflow

The invoices page SHALL provide invoice creation through a non-destructive modal workflow that follows the shared popup dialog footer pattern.

#### Scenario: Create invoice from dialog
- **GIVEN** a user opens the invoice creation flow
- **WHEN** the dialog is rendered
- **THEN** the dialog exposes project, date range, rate, discount, and total amount inputs
- **AND** the dialog footer shows the primary `Save Invoice` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Invoice dialog dismissal uses popup close control
- **GIVEN** the invoice creation dialog is open and not saving
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating an invoice

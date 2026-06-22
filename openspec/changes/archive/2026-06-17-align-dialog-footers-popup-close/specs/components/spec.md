## ADDED Requirements

### Requirement: Non-Destructive Popup Dialog Footers

Non-destructive PrimeVue popup form dialogs in frontend SPAs SHALL use the shared primary-action-only footer pattern and rely on the dialog's built-in dismissal controls instead of rendering a footer or body `Cancel` dismissal button.

#### Scenario: Non-destructive popup footer contains primary action only
- **WHEN** a non-destructive form dialog popup renders its footer
- **THEN** the footer contains the dialog's primary submit, save, or selection action
- **AND** the footer does not render a secondary `Cancel` action only for dismissing the popup

#### Scenario: Popup dismissal remains available through dialog controls
- **GIVEN** a non-destructive form dialog popup is open and not in a protected submitting state
- **WHEN** the user activates the built-in close control or existing non-destructive mask dismissal
- **THEN** the popup closes without submitting the form
- **AND** the implementation does not require a footer `Cancel` button for that dismissal path

#### Scenario: Mobile popup footer keeps primary action prominent
- **WHEN** a non-destructive form dialog popup renders at the mobile breakpoint
- **THEN** the primary footer action uses the documented full-width mobile treatment where applicable
- **AND** no stacked secondary `Cancel` footer button is added for dismissal

#### Scenario: Explicit non-popup and destructive actions are preserved
- **WHEN** a frontend surface renders destructive confirmation choices, non-popup form reset actions, or row-level actions
- **THEN** those explicit safe/reject, reset, or row actions remain available according to their owning feature requirements
- **AND** they are not removed solely because non-destructive popup form dialog footers use the primary-action-only pattern

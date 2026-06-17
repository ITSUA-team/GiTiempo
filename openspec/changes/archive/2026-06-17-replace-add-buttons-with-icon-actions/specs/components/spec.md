## ADDED Requirements

### Requirement: Primary Icon-Only Contextual Create Actions
Contextual create, add, and invite actions SHALL use a primary icon-only action when the surrounding section or table header already names the entity or workflow context.

#### Scenario: Section header create action is icon-only
- **GIVEN** a grouped record-list section header already identifies the target context, such as a day group or project group
- **WHEN** the section exposes a create or add entry point
- **THEN** the action SHALL render as a filled primary icon-only control
- **AND** the action SHALL expose a tooltip and accessible label that preserve the explicit action text.

#### Scenario: Table header create action is icon-only
- **GIVEN** an admin management table header already identifies the table context
- **WHEN** the header exposes a create, invite, or new-record entry point next to table discovery controls
- **THEN** the action SHALL render as a filled primary icon-only control
- **AND** the action SHALL expose a tooltip and accessible label that preserve the explicit action text.

#### Scenario: Icon-only opener does not rename submit actions
- **WHEN** a create, add, invite, or new-record opener is converted to the primary icon-only pattern
- **THEN** the dialog or route opened by that action SHALL keep its existing title, field labels, validation, and submit-button copy unless a separate requirement changes them.

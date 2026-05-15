## ADDED Requirements

### Requirement: Table Row Actions Are Icon-Only

Frontend table row actions SHALL render as compact icon-only controls while preserving the former action text as tooltip copy and accessible labels.

#### Scenario: Non-destructive row action renders as icon-only

- **WHEN** a user or admin table row renders a non-destructive action such as edit, assign, archive restore, or view
- **THEN** the action is displayed as an icon-only PrimeVue-compatible control with no visible action text inside the table cell
- **AND** the former action text is available as tooltip copy and as the control's accessible label
- **AND** the icon uses the documented brand or muted token treatment for its semantic state

#### Scenario: Destructive row action renders as icon-only

- **WHEN** a user or admin table row renders a destructive action such as delete, remove, or archive
- **THEN** the action is displayed as an icon-only PrimeVue-compatible control with no visible action text inside the table cell
- **AND** the former action text is available as tooltip copy and as the control's accessible label
- **AND** the icon uses the documented destructive token treatment

#### Scenario: Row action cells stay compact and right-aligned

- **WHEN** a table includes an actions column
- **THEN** the action controls are visually secondary to the row content
- **AND** the controls remain compact, right-aligned, and consistent across `user-web` and `admin-web`

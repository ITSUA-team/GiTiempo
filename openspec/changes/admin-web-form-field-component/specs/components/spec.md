## ADDED Requirements

### Requirement: AppFormField As Standard Label Wrapper For Non-Text Controls

Both `admin-web` and `user-web` MUST use `AppFormField` from `@gitiempo/web-shared` when pairing a label with a `Select`, `MultiSelect`, `DatePicker`, or any other non-text control, rather than writing inline label div boilerplate.

#### Scenario: Inline edit form uses AppFormField

- **WHEN** the `ProjectsView` inline edit row renders the members and visibility fields
- **THEN** each field uses `AppFormField` with `size="sm"` wrapping the `MultiSelect` or `Select` control
- **AND** the label font matches the compact design spec (`fontSize:12`)

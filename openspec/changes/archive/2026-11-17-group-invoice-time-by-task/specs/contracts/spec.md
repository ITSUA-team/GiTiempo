## ADDED Requirements

### Requirement: Invoice time display mode contract

The shared create, billing-preview and update inputs SHALL accept an optional `timeDisplayMode` whose only values are `entries` and `tasks`. Billing preview, detail and saved-invoice mutation responses SHALL expose the resolved mode. The shared schemas and published OpenAPI SHALL describe the same values and optionality. Entry selection and entry counts SHALL retain their current individual-entry semantics in both modes.

#### Scenario: Omitted fields on create and update

- **WHEN** a caller creates an invoice without a mode
- **THEN** its response reports `entries`
- **WHEN** a caller updates a `tasks` invoice without specifying a mode
- **THEN** its response still reports `tasks`

#### Scenario: Preview with an omitted mode

- **WHEN** a billing preview omits the mode
- **THEN** a new-invoice preview resolves to `entries` and a revision preview identifying an existing invoice resolves to its saved mode (or `entries` for a legacy invoice)
- **AND** passing an explicit mode overrides that preview default without updating the saved invoice

#### Scenario: Invalid display mode

- **WHEN** a caller sends null or an unknown display mode to create, billing preview or update
- **THEN** validation rejects the request

#### Scenario: Task mode retains entry-level data

- **WHEN** a caller previews or saves a selection of two entry IDs belonging to one task with mode `tasks`
- **THEN** the preview and detail return both entries with their task IDs and rounded durations, and the included-entry count is two

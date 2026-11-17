## ADDED Requirements

### Requirement: Preserve the display mode and derive task rows from invoice snapshots

Each invoice document SHALL retain its own mode. Saved task rows SHALL group included entry snapshots by task ID, sum their rounded durations and follow the order of each task’s first included entry. The label SHALL use its first nonblank included snapshot name in saved order, falling back to **Unnamed task**.

#### Scenario: Same titles across tasks and people

- **GIVEN** two task IDs have the same saved title and two people logged entries against the first task
- **WHEN** the saved invoice is displayed by task
- **THEN** it contains two task rows in first-included-entry order, with both people's included time combined under the first ID

#### Scenario: Resolve missing or differing historical names

- **GIVEN** the included snapshots for a single task have names null, Original and Revised in that order
- **WHEN** the saved invoice details or PDF are generated after the live task is renamed or removed
- **THEN** the task row is labeled Original and retains its saved duration
- **AND** a different task whose snapshots lack a name appears independently as Unnamed task

#### Scenario: Older invoice in its original layout

- **WHEN** an invoice without a saved display mode is opened or exported
- **THEN** it resolves to `entries` without rewriting the invoice and retains its original entries, billing snapshot and totals

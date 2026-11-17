## ADDED Requirements

### Requirement: Save and revise the invoice time format

The API SHALL save the selected mode with the invoice revision. A mode-only update SHALL use the usual workspace, role, project access and revision checks. It SHALL preserve the saved billing inputs, entry links, snapshots and monetary totals.

#### Scenario: Authorized revision or stale edit

- **GIVEN** a PM can access an invoice and its source task has since been renamed
- **WHEN** the PM submits only a new mode and the current expected revision
- **THEN** the changed invoice uses its saved entry names, durations and totals without reselecting entries
- **WHEN** another editor submits a mode change using the stale revision or a PM without project access attempts an update
- **THEN** the API returns the applicable conflict or access error and preserves the saved revision

#### Scenario: Copy for a new period

- **GIVEN** the source invoice uses Task mode
- **WHEN** the user creates from that invoice and reviews a different period
- **THEN** the draft starts in Task mode and normal eligibility and selection rules determine its new entries
- **AND** changing the new invoice's mode or selections leaves the source intact

#### Scenario: Preview matches creation

- **WHEN** identical entries and billing inputs are previewed and saved under either display mode
- **THEN** both modes return the same selected entry IDs, billed hours, subtotal, discount and total
- **AND** the same eligibility and duplicate-billing checks apply

### Requirement: Export the saved invoice time format

PDF export SHALL use the saved display mode. Time entry mode SHALL retain the individual service lines. Task mode SHALL show one service line per included task with its saved task name, summed billed hours, invoice rate and pre-discount amount. Entry dates, worker names and entry descriptions SHALL be omitted from the task lines. Task line amounts SHALL sum the cents already allocated to their entries by the invoice's cumulative proportional allocation in saved entry order.

#### Scenario: Interleaved tasks share a fractional-cent subtotal

- **GIVEN** three entries have equal billed duration, the saved order is A, B, A and the pre-discount subtotal is ten cents
- **WHEN** the PDF is exported in Task mode
- **THEN** the entry allocations of three, four and three cents produce six cents for task A and four for task B
- **AND** the subtotal, discount and invoice total match the Time entry PDF

#### Scenario: Readable export from the saved revision

- **WHEN** a Task invoice with long task names or enough included tasks for multiple pages is downloaded during an unsaved edit
- **THEN** the PDF wraps task names, paginates readable rows and totals, and uses only the saved revision

#### Scenario: No included time

- **WHEN** an otherwise exportable Task invoice has no selected entries
- **THEN** its PDF contains no task lines and shows zero subtotal, discount amount and total

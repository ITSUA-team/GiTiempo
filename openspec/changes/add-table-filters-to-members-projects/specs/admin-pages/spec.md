## MODIFIED Requirements

### Requirement: Reports Generation And Export
The reports page MUST support report setup controls for backend CSV export, scoped report summaries for loaded data, table-only discovery filters, and backend CSV generation while preserving project-scope restrictions for PM users.

#### Scenario: CSV export date range keeps local-day boundaries
- **WHEN** the reports page converts a selected report date range into a CSV export query
- **THEN** `dateFrom` uses the selected start date's browser-local `00:00:00.000` boundary converted to ISO
- **AND** `dateTo` uses the browser-local `00:00:00.000` boundary for the day after the selected end date converted to ISO
- **AND** the backend continues to receive `dateTo` as an exclusive upper boundary
- **AND** moving the frontend implementation to `date-fns` does not change the shared API payload shape or require backend/OpenAPI changes

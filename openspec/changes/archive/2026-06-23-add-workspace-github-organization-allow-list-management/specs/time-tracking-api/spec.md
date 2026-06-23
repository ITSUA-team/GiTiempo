## MODIFIED Requirements

### Requirement: Chrome Extension Can Start Timer From GitHub Issue
The backend MUST preserve canonical GitHub provider mappings when starting timers from GitHub issues so existing workspace records are reused instead of duplicated by repository owner or name casing drift.

#### Scenario: Extension reuses existing GitHub mapping regardless of repository casing
- **GIVEN** local provider references already map the submitted GitHub issue using a different repository-name or owner casing variant
- **WHEN** the extension starts a timer for that same GitHub issue
- **THEN** the backend reuses the existing project and task records
- **AND** does not create duplicate GitHub provider references for the casing variant

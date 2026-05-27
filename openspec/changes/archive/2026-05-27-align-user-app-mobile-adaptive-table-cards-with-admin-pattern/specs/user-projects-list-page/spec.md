## ADDED Requirements

### Requirement: User Projects Task Sections Adapt To Mobile Cards
User-web Projects task sections SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked task cards below the documented mobile breakpoint.

#### Scenario: Projects task sections render mobile cards
- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per task instead of the fixed-width desktop task table
- **AND** each task card shows the task title, status, updated metadata, and icon-only `Edit` and `Delete` actions with accessible labels
- **AND** the project-level `+ Add task` action remains available in the section header

#### Scenario: Projects task sections preserve desktop table
- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop task table with task, status, updated, and actions columns

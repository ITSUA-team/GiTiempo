## ADDED Requirements

### Requirement: User Record Lists Adapt To Mobile Cards
User-web record-list surfaces SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked record cards below the documented mobile breakpoint.

#### Scenario: Dashboard recent entries render mobile cards
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders below the mobile breakpoint
- **THEN** the recent entries section renders one stacked card per recent entry instead of the fixed-width desktop table
- **AND** each card shows the entry task title, project name, time range, duration, and highlighted running/current-entry state when applicable
- **AND** the `View all` action remains available from the recent entries section

#### Scenario: Dashboard recent entries preserve desktop table
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop table with task, project, range, and duration columns

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

#### Scenario: Time entry day sections render mobile cards
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per time entry instead of the fixed-width desktop entry table
- **AND** each card shows the task title, optional description, project name, time range, duration, and running-entry highlight when applicable
- **AND** completed entries expose icon-only `Edit` and `Delete` actions with accessible labels
- **AND** running entries do not expose edit or delete actions and continue to direct stopping to the global top-bar timer

#### Scenario: Time entry day sections preserve desktop table
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop entry table with task, project, time, duration, and actions columns

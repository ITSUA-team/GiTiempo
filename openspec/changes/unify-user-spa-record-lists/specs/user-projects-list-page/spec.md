# Spec Delta

## MODIFIED Requirements

### Requirement: User Projects Task Sections Adapt To Mobile Cards

User-web Projects task sections SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked task cards below the documented mobile breakpoint. Projects task rows and cards SHALL hide the column-heading strip, place the timer action before the task title on mobile, and highlight the active task on both desktop and mobile.

#### Scenario: Projects task sections render mobile cards

- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per task instead of the fixed-width desktop task table
- **AND** each task card places the timer action before the task title, matching the unified record-list layout
- **AND** each task card shows a clickable task title, status, and updated metadata without separate `Edit` or `Delete` actions
- **AND** the task card representing the authoritative running timer is highlighted
- **AND** the project-level primary icon-only `Add task` action remains available in the section header with explicit tooltip and accessible label copy `Add task`.

#### Scenario: Projects task sections preserve desktop table

- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop task table with task, status, and updated columns
- **AND** the table does not render a column-heading strip
- **AND** the task row representing the authoritative running timer is highlighted
- **AND** the project-level primary icon-only `Add task` action remains available in the section header with explicit tooltip and accessible label copy `Add task`.

## ADDED Requirements

### Requirement: User Projects Task Sections Hide Column Headings

Projects task sections SHALL hide the column-heading strip on all viewports through the existing page-level table option, while preserving project section headings and mobile field labels.

#### Scenario: Projects hides column headings on desktop

- **GIVEN** the Projects page renders a visible project section with active tasks at or above the mobile breakpoint
- **WHEN** the task table renders
- **THEN** the table does not render a column-heading strip
- **AND** the project section heading remains visible
- **AND** the task, status, and updated columns retain their content and layout

#### Scenario: Projects preserves mobile metadata content

- **GIVEN** the Projects page renders a visible project section with active tasks below the mobile breakpoint
- **WHEN** the task cards render
- **THEN** each task card shows the task name, status, and updated time as visible content
- **AND** the project section heading remains visible

### Requirement: User Projects Active Task Highlight

Projects SHALL highlight the task row or card that represents the authoritative running timer on both desktop and mobile, so users can identify the active task at a glance alongside the existing direct timer action.

#### Scenario: Active task row is highlighted on desktop

- **GIVEN** the authenticated member's authoritative running timer belongs to a task rendered on the Projects page
- **WHEN** the Projects page renders at or above the mobile breakpoint
- **THEN** the task row representing the running timer is visually highlighted
- **AND** the row renders the `Stop timer` direct action as specified by the existing direct timer controls requirement

#### Scenario: Active task card is highlighted on mobile

- **GIVEN** the authenticated member's authoritative running timer belongs to a task rendered on the Projects page
- **WHEN** the Projects page renders below the mobile breakpoint
- **THEN** the task card representing the running timer is visually highlighted
- **AND** the card renders the `Stop timer` direct action as specified by the existing direct timer controls requirement

### Requirement: User Projects Loading Skeletons Match Unified Layouts

Projects loading skeletons SHALL match the headerless task-section layouts and the final row dimensions after unification.

#### Scenario: Projects loading skeleton matches headerless layout

- **WHEN** the Projects page data request is pending
- **THEN** the skeleton does not reserve space for a column-heading strip
- **AND** the skeleton row or card dimensions match the final unified row or card dimensions

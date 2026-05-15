## ADDED Requirements

### Requirement: Shared Section Header Owns Stats Header Layout
The frontend codebase SHALL use `SectionHeader` as the canonical shared Vue component for page, section, and stats-header title surfaces.

#### Scenario: Stats header renders through shared section header
- **WHEN** a page needs a title, description, primary action region, and optional stat-card row
- **THEN** it renders that surface through `SectionHeader`
- **AND** it does not import or render a standalone `StatsHeader` component

#### Scenario: Section header keeps focused slots
- **WHEN** `SectionHeader` renders page, section, or stats variants
- **THEN** consumers configure copy through `title` and optional `description`
- **AND** consumers provide only the existing action slot plus an optional stats slot for the stats variant
- **AND** route-level orchestration, data loading, and app-specific actions remain outside the shared component

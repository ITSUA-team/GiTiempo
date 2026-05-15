## ADDED Requirements

### Requirement: Shared Section Header Owns Stats Header Layout
The frontend codebase SHALL use `SectionHeader` as the canonical shared Vue component for page, section, and stats-header title surfaces.

#### Scenario: Page action header renders through shared section header
- **WHEN** a page needs a title, description, and primary action region without a stat-card row
- **THEN** it renders that surface through the page header behavior of `SectionHeader`
- **AND** it does not use the stats variant only to obtain action alignment
- **AND** it does not keep a separate wrapper row for title/action alignment outside `SectionHeader`

#### Scenario: Stats header renders through shared section header
- **WHEN** a page needs a title, description, primary action region, and stat-card row
- **THEN** it renders that surface through the stats variant of `SectionHeader`
- **AND** it does not import or render a standalone `StatsHeader` component

#### Scenario: Section header keeps focused slots
- **WHEN** `SectionHeader` renders page, section, or stats variants
- **THEN** consumers configure copy through `title` and optional `description`
- **AND** consumers may provide the existing action slot for page, section, or stats variants
- **AND** consumers provide the optional stats slot only for the stats variant
- **AND** route-level orchestration, data loading, and app-specific actions remain outside the shared component

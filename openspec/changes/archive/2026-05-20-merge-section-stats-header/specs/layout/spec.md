## ADDED Requirements

### Requirement: Stats Page Header Pattern Uses Shared Header Structure
Pages with stat-card summaries SHALL use the same shared header structure as standard page headers while preserving the stat-card row below the title/action row.

#### Scenario: Page header includes action without stats row
- **WHEN** a product page renders a title, subtitle, and primary action without stat-card summary content
- **THEN** the title/subtitle and action align through the shared page header structure
- **AND** the page does not use a stats-header layout only to achieve action alignment
- **AND** no empty stats row is rendered

#### Scenario: Page header includes stats row
- **WHEN** a product page renders a title, subtitle, primary action, and stat-card summary row
- **THEN** the title/subtitle and action align through the shared header structure
- **AND** the stat-card row appears below that header row with the documented management-page spacing

#### Scenario: Page without stats keeps standard header behavior
- **WHEN** a product page does not provide stat-card summary content or a primary action
- **THEN** the shared header renders the standard page or section header without an empty stats row

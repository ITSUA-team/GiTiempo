## ADDED Requirements

### Requirement: PageHeader shared component renders title, description, stats, and a CTA slot
`packages/web-shared` SHALL export a `PageHeader` Vue component that accepts `title: string`, `description?: string`, and `stats?: Array<{ label: string; value: string | number }>` props and exposes a default slot for CTA actions (e.g., a Button).

#### Scenario: Render with all props
- **WHEN** `PageHeader` is mounted with `title`, `description`, one or more `stats`, and a slotted CTA button
- **THEN** the heading, description text, stat cards (label + value each), and CTA all render in the correct layout

#### Scenario: Render without optional props
- **WHEN** `PageHeader` is mounted with only `title`
- **THEN** only the title renders; no description, no stat cards, and the CTA area is empty

#### Scenario: Exported from web-shared components path
- **WHEN** a consuming app imports `PageHeader` from `@gitiempo/web-shared/components`
- **THEN** the import resolves without type errors

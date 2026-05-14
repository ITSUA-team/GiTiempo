## ADDED Requirements

### Requirement: Shared Stat Card Surface Is Extractable

The frontend codebase SHALL place the documented "stat card" surface (compact label-plus-value tile rendered in a card surface) in `@gitiempo/web-shared` once a second admin or user page renders it through the same prop-driven contract.

#### Scenario: Stat card is shared across admin pages

- **WHEN** `admin-web` renders the same label-plus-value stat card on more than one route
- **THEN** the stat card is implemented as a shared prop-driven Vue component in `@gitiempo/web-shared`
- **AND** consumers do not maintain a parallel app-local stat card with the same markup

### Requirement: Shared Management Table Chrome Is Extractable

The frontend codebase SHALL place the boxed admin management-table chrome (rounded outer border, fixed-height custom header row, stripped PrimeVue DataTable body, link-button action styles, edge-to-edge expansion row) in `@gitiempo/web-shared` once a second admin page renders the same chrome around its table.

#### Scenario: Management table chrome is shared across admin pages

- **WHEN** `admin-web` renders more than one page with the same boxed management table chrome
- **THEN** the chrome is implemented as a shared prop-driven Vue component in `@gitiempo/web-shared`
- **AND** product-specific columns, filters, and per-row content stay in the consuming page
- **AND** consumers do not maintain a parallel app-local copy of the chrome

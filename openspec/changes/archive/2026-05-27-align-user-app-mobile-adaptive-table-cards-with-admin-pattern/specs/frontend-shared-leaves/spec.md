## ADDED Requirements

### Requirement: Shared Mobile Record List Leaves
The frontend shared package SHALL provide only neutral, presentational leaves for mobile record-list rendering when the same viewport and card shell behavior is used by both SPAs.

#### Scenario: Shared viewport helper matches shell breakpoint
- **WHEN** a frontend component needs to switch between desktop table rendering and mobile record-card rendering
- **THEN** it can use a shared viewport helper that treats widths below `640px` as mobile
- **AND** the helper remains safe when browser viewport APIs are unavailable

#### Scenario: Shared mobile record card stays presentational
- **WHEN** a user-web or admin-web list renders a mobile record card
- **THEN** the shared card leaf provides only the token-based surface, spacing, border, and optional actions slot
- **AND** product-specific record fields, row states, and action behavior remain owned by the app-level component using the card

#### Scenario: Shared extraction preserves existing admin behavior
- **GIVEN** admin-web already renders mobile record cards for management tables
- **WHEN** the viewport helper or mobile card shell is moved into the shared frontend package
- **THEN** admin-web preserves the same mobile card behavior, accessible row actions, and desktop table behavior after updating imports

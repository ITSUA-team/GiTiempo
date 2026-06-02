## MODIFIED Requirements

### Requirement: Consistent Page Header Pattern

Every SPA page MUST use the shared page-header structure with title, subtitle, and primary action alignment, and repeated page-header chrome SHALL flow through the documented shared component conventions.

#### Scenario: Page renders standard header block

- **GIVEN** a product page is rendered in either SPA
- **WHEN** the header is shown
- **THEN** it SHALL display a page title and subtitle
- **AND** the primary action SHALL align to the right side of the header block on desktop layouts.

#### Scenario: Repeated page header uses shared structure

- **WHEN** a `user-web`, `admin-web`, or shared Vue page needs the documented title, subtitle, and action header surface
- **THEN** it SHALL use the established shared page-header component or structure instead of duplicating bespoke wrapper markup
- **AND** app-specific copy, route actions, and slots SHALL remain owned by the consuming page.

#### Scenario: Header action hierarchy remains clear on narrow layouts

- **WHEN** the page header renders below the mobile breakpoint
- **THEN** title, subtitle, and primary action SHALL remain reachable in a predictable order
- **AND** responsive stacking SHALL preserve the documented primary action hierarchy instead of hiding the action in decorative chrome.

#### Scenario: Page header styling uses design-system primitives

- **WHEN** page-header spacing, text, surface, border, radius, or shadow styling is added or changed
- **THEN** it SHALL use documented design-system tokens and shared PrimeVue/Tailwind conventions
- **AND** it SHALL NOT introduce raw visual values, `!important` utilities, or deep selectors for standard header styling.

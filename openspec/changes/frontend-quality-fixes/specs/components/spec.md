## MODIFIED Requirements

### Requirement: Token-Based Visual Styling

Frontend components MUST use the shared design tokens and semantic utilities instead of ad hoc raw styling values.

#### Scenario: Component uses brand and surface styling

- **GIVEN** a reusable UI component is implemented
- **WHEN** its colors and spacing are defined
- **THEN** the component uses shared token-backed utilities for those values (`text-text-dark`, `text-text-muted`, `bg-surface`, `bg-app-bg`, `bg-accent-tint`, `text-brand`, `border-brand`, etc.)
- **AND** the component does not use raw hex values for any color that has a documented token equivalent in `docs/ui/components.md`

#### Scenario: Raw hex permitted only for undocumented colors

- **WHEN** a component requires a color that has no corresponding token in `packages/web-config/src/styles/tokens.css`
- **THEN** a raw hex class is acceptable for that specific value
- **AND** the deviation is visible in the component markup (no hidden inline style)

### Requirement: PrimeVue As Primary App Component Surface

Application-level buttons, inputs, tables, tags, avatars, and loading surfaces SHALL use the established PrimeVue-based component conventions.

#### Scenario: Primary action button in application surface

- **GIVEN** a page needs a primary action
- **WHEN** the button is rendered in a standard SPA surface
- **THEN** it uses PrimeVue `<Button>` (not raw `<button>`)
- **AND** loading or disabled behavior follows the shared component rules

#### Scenario: Secondary or text-link action button

- **GIVEN** a page needs a secondary or navigation action (e.g., Back, Cancel)
- **WHEN** the button is rendered in a standard SPA surface
- **THEN** it uses PrimeVue `<Button>` with appropriate `variant` (`outlined` or `text`) and `severity`
- **AND** does not use a raw `<button>` element

#### Scenario: Form field validation messaging

- **GIVEN** a form field has invalid user input
- **WHEN** the field is rendered
- **THEN** the control shows the invalid state
- **AND** the validation message is visible in the helper-text area

### Requirement: Shared Empty And Loading States

The frontend MUST use consistent empty-state and loading-state patterns across pages.

#### Scenario: Empty list or dashboard section

- **GIVEN** a page section has no data to render
- **WHEN** the section is shown
- **THEN** it uses the shared empty-state pattern with primary message and optional action

#### Scenario: Full-page asynchronous load

- **GIVEN** a page is waiting for required data to load
- **WHEN** the page is not yet ready
- **THEN** it presents the shared loading-state pattern appropriate for the page scope

## ADDED Requirements

### Requirement: Inline Edit Row Closes Only After Confirmed Save

When an inline-edit row in the Projects table is saved, the row MUST remain visible until the save operation completes. The row SHALL close only on a confirmed successful save.

#### Scenario: Successful save closes the row

- **WHEN** the user clicks Save in an inline-edit row
- **AND** the save operation succeeds
- **THEN** the inline-edit row collapses
- **AND** the updated values are reflected in the table

#### Scenario: Failed save keeps the row open

- **WHEN** the user clicks Save in an inline-edit row
- **AND** the save operation fails
- **THEN** the inline-edit row remains open with the user's unsaved values still visible
- **AND** an error toast is shown

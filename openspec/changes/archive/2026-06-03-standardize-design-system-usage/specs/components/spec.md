## MODIFIED Requirements

### Requirement: Token-Based Visual Styling

Frontend components MUST use shared design tokens and semantic utilities for standard design-system visual decisions instead of ad hoc raw styling values.

#### Scenario: Component uses brand and surface styling

- **GIVEN** a reusable UI component is implemented
- **WHEN** its standard colors, surface, border, radius, shadow, spacing, or typography are defined
- **THEN** the component SHALL use shared token-backed utilities or shared PrimeVue design tokens for those values
- **AND** the component SHALL NOT rely on raw one-off hex values for standard design-system surfaces.

#### Scenario: Touched SPA markup avoids raw visual values

- **WHEN** a standard `user-web`, `admin-web`, or shared Vue UI surface is added or materially changed
- **THEN** brand, accent, text, surface, divider, destructive, radius, and shadow styling SHALL use the documented semantic token utilities or shared PrimeVue preset tokens
- **AND** raw hex values SHALL NOT appear in class attributes or inline styles for values already covered by the design system.

#### Scenario: Arbitrary utilities remain layout-specific

- **WHEN** a layout requires an exact width, height, grid, or timing value that is not represented by a documented token
- **THEN** an arbitrary Tailwind utility MAY be used for that layout-specific value
- **AND** it SHALL NOT replace a documented design-system token for color, text, radius, shadow, or standard spacing.

### Requirement: PrimeVue As Primary App Component Surface

Application-level buttons, inputs, textareas, selects, date pickers, auto-completes, checkboxes, tables, paginators, tags, badges, avatars, dialogs, confirmation dialogs, toasts, and loading surfaces SHALL use established PrimeVue-based component conventions when PrimeVue has an equivalent.

#### Scenario: Primary action button in application surface

- **GIVEN** a page needs a primary action
- **WHEN** the button is rendered in a standard SPA surface
- **THEN** it SHALL use the shared PrimeVue button conventions
- **AND** loading or disabled behavior SHALL follow the shared component rules.

#### Scenario: Form field validation messaging

- **GIVEN** a form field has invalid user input
- **WHEN** the field is rendered
- **THEN** the control SHALL show the invalid state through the matching PrimeVue component API
- **AND** the validation message SHALL be visible in the helper-text area.

#### Scenario: Standard control has PrimeVue equivalent

- **WHEN** a standard SPA UI surface renders a control or display element that has a PrimeVue equivalent
- **THEN** the implementation SHALL use that PrimeVue component instead of recreating the same behavior with raw HTML or bespoke markup
- **AND** project-specific visual styling SHALL be applied through shared token utilities, the global PrimeVue preset, or component `pt` overrides.

#### Scenario: Non-PrimeVue control exception is explicit

- **WHEN** a standard SPA UI surface uses custom non-PrimeVue interactive markup
- **THEN** the implementation SHALL be justified by the absence of a suitable PrimeVue equivalent or by an approved bespoke design requirement
- **AND** it SHALL still provide keyboard behavior, accessible names, visible focus treatment, and token-backed styling consistent with the design system.

## ADDED Requirements

### Requirement: PrimeVue Styling Overrides Use Preset And Pass Through

PrimeVue styling customizations MUST use the shared preset for broad styling and component pass-through (`pt`) for instance-specific DOM customization before resorting to local CSS.

#### Scenario: Global styling belongs in the shared preset

- **WHEN** multiple PrimeVue instances need the same brand, surface, focus, border, or component token behavior
- **THEN** the styling SHALL be implemented in the shared PrimeVue preset or shared theme configuration
- **AND** app-local instances SHALL NOT duplicate broad preset behavior with one-off internal overrides.

#### Scenario: Instance styling uses documented pass-through keys

- **WHEN** a PrimeVue component instance needs project-specific internal DOM classes or attributes
- **THEN** the implementation SHALL use documented `pt` keys for that component
- **AND** `pt` values MAY be strings, objects, or functions returning strings or objects with Vue-compatible `class` and `style` bindings.

#### Scenario: Styling fix avoids specificity escalation

- **WHEN** a PrimeVue styling override does not apply as expected
- **THEN** the implementation SHALL fix the shared preset, documented `pt` target, CSS layer order, or Tailwind source registration
- **AND** it SHALL NOT add `!important` Tailwind utilities or deep selectors for normal design-system styling fixes.

#### Scenario: Pass-through preserves PrimeVue accessibility

- **WHEN** PrimeVue internals are customized with `pt`
- **THEN** the customization SHALL preserve PrimeVue-generated `role`, `aria-*`, `tabindex`, and `id` attributes
- **AND** icon-only actions SHALL keep accessible labels that describe the action.

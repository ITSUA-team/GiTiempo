# Frontend Components Specification

## Purpose

Define shared component behavior and design-system usage rules across GiTiempo frontend applications.
## Requirements
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

### Requirement: Shared Empty And Loading States

The frontend MUST use consistent empty-state, request-error, and loading-state patterns across pages.

#### Scenario: Empty list or dashboard section

- GIVEN a page section has no data to render
- WHEN the section is shown
- THEN it uses the shared empty-state pattern with primary message and optional action

#### Scenario: Full-page asynchronous load

- GIVEN a page is waiting for required data to load
- WHEN the page is not yet ready
- THEN it presents a page-level skeleton matching the final page structure where practical
- AND it does not render an empty state before the initial request finishes

#### Scenario: Request errors stay distinct from empty states

- GIVEN a page or section fails to load required data
- WHEN the failed request state is rendered
- THEN it presents a request-error state with retry affordance where retry is available
- AND it does not substitute an empty-state message for the failed request

#### Scenario: Structured settings first load

- GIVEN a content-rich settings page is waiting for required initial data
- WHEN the page is not yet ready
- THEN it may use PrimeVue Skeleton placeholders matching the final header, card, form rows, and action layout
- AND request-error states remain distinct from empty states or default form values

### Requirement: Compact Icon-Only Table Row Actions

Table row action surfaces MUST support compact icon-only actions aligned to the right edge of the row.

#### Scenario: Non-destructive row actions stay compact

- GIVEN a table row exposes non-destructive actions such as view, edit, or duplicate
- WHEN the actions are rendered
- THEN they use compact icon-only controls
- AND the action cell is right-aligned within the row

#### Scenario: Destructive row actions remain clearly labeled by affordance

- GIVEN a table row exposes a destructive action such as delete or remove
- WHEN the action is rendered
- THEN it uses the same compact icon-only pattern
- AND the destructive affordance is distinguishable from non-destructive actions through design-system styling and confirmation behavior where needed

#### Scenario: Row action cell stays compact

- GIVEN a table includes an action column for per-row actions
- WHEN the row is displayed
- THEN the action cell stays compact and does not expand the table with full text labels
- AND the action controls remain visually grouped at the right side of the row

### Requirement: Primary Icon-Only Contextual Create Actions
Contextual create, add, and invite actions SHALL use a primary icon-only action when the surrounding section or table header already names the entity or workflow context.

#### Scenario: Section header create action is icon-only
- **GIVEN** a grouped record-list section header already identifies the target context, such as a day group or project group
- **WHEN** the section exposes a create or add entry point
- **THEN** the action SHALL render as a filled primary icon-only control
- **AND** the action SHALL expose a tooltip and accessible label that preserve the explicit action text.

#### Scenario: Table header create action is icon-only
- **GIVEN** an admin management table header already identifies the table context
- **WHEN** the header exposes a create, invite, or new-record entry point next to table discovery controls
- **THEN** the action SHALL render as a filled primary icon-only control
- **AND** the action SHALL expose a tooltip and accessible label that preserve the explicit action text.

#### Scenario: Icon-only opener does not rename submit actions
- **WHEN** a create, add, invite, or new-record opener is converted to the primary icon-only pattern
- **THEN** the dialog or route opened by that action SHALL keep its existing title, field labels, validation, and submit-button copy unless a separate requirement changes them.

### Requirement: Non-Destructive Popup Dialog Footers

Non-destructive PrimeVue popup form dialogs in frontend SPAs SHALL use the shared primary-action-only footer pattern and rely on the dialog's built-in dismissal controls instead of rendering a footer or body `Cancel` dismissal button.

#### Scenario: Non-destructive popup footer contains primary action only

- **WHEN** a non-destructive form dialog popup renders its footer
- **THEN** the footer contains the dialog's primary submit, save, or selection action
- **AND** the footer does not render a secondary `Cancel` action only for dismissing the popup

#### Scenario: Popup dismissal remains available through dialog controls

- **GIVEN** a non-destructive form dialog popup is open and not in a protected submitting state
- **WHEN** the user activates the built-in close control or existing non-destructive mask dismissal
- **THEN** the popup closes without submitting the form
- **AND** the implementation does not require a footer `Cancel` button for that dismissal path

#### Scenario: Mobile popup footer keeps primary action prominent

- **WHEN** a non-destructive form dialog popup renders at the mobile breakpoint
- **THEN** the primary footer action uses the documented full-width mobile treatment where applicable
- **AND** no stacked secondary `Cancel` footer button is added for dismissal

#### Scenario: Explicit non-popup and destructive actions are preserved

- **WHEN** a frontend surface renders destructive confirmation choices, non-popup form reset actions, or row-level actions
- **THEN** those explicit safe/reject, reset, or row actions remain available according to their owning feature requirements
- **AND** they are not removed solely because non-destructive popup form dialog footers use the primary-action-only pattern

# Frontend Components Specification

## Purpose

Define shared component behavior and design-system usage rules across GiTiempo frontend applications.

## Requirements

### Requirement: Token-Based Visual Styling

Frontend components MUST use the shared design tokens and semantic utilities instead of ad hoc raw styling values.

#### Scenario: Component uses brand and surface styling

- GIVEN a reusable UI component is implemented
- WHEN its colors and spacing are defined
- THEN the component uses shared token-backed utilities for those values
- AND the component does not rely on raw one-off hex values for standard design-system surfaces

### Requirement: PrimeVue As Primary App Component Surface

Application-level buttons, inputs, tables, tags, avatars, and loading surfaces SHALL use the established PrimeVue-based component conventions.

#### Scenario: Primary action button in application surface

- GIVEN a page needs a primary action
- WHEN the button is rendered in a standard SPA surface
- THEN it uses the shared PrimeVue button conventions
- AND loading or disabled behavior follows the shared component rules

#### Scenario: Form field validation messaging

- GIVEN a form field has invalid user input
- WHEN the field is rendered
- THEN the control shows the invalid state
- AND the validation message is visible in the helper-text area

### Requirement: Shared Empty And Loading States

The frontend MUST use consistent empty-state and loading-state patterns across pages.

#### Scenario: Empty list or dashboard section

- GIVEN a page section has no data to render
- WHEN the section is shown
- THEN it uses the shared empty-state pattern with primary message and optional action

#### Scenario: Full-page asynchronous load

- GIVEN a page is waiting for required data to load
- WHEN the page is not yet ready
- THEN it presents the shared loading-state pattern appropriate for the page scope

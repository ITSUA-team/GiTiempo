# Shared AppInput Component Specification

## Purpose

Define the behavior of the `AppInput` shared form-field component available in `@gitiempo/web-shared` and usable across all GiTiempo frontend apps.

## Requirements

### Requirement: AppInput Renders Label And Input Together

`AppInput` MUST render a visible label and a text input in a single composed unit so that consumers do not need to write label+input wiring manually.

#### Scenario: Basic render with label and value

- **WHEN** `AppInput` is rendered with `id`, `label`, and `modelValue` props
- **THEN** a `<label>` element is visible with the provided label text
- **AND** the label `for` attribute matches the `id` prop
- **AND** an `InputText` control is rendered with the given value bound

#### Scenario: Label font matches design spec

- **WHEN** `AppInput` is rendered
- **THEN** the label uses `fontSize: 13px` and `fontWeight: 500`
- **AND** the label uses the `$color-text-dark` design token for color

### Requirement: AppInput Supports Disabled State

`AppInput` MUST visually and functionally disable the input when the `disabled` prop is true.

#### Scenario: Input is disabled

- **WHEN** the `disabled` prop is `true`
- **THEN** the underlying input control is non-interactive
- **AND** the input is visually styled as disabled per PrimeVue conventions

### Requirement: AppInput Supports Helper And Error Text

`AppInput` MUST optionally display helper text or an error message below the input field.

#### Scenario: Error message is shown

- **WHEN** a non-empty `error` prop is provided
- **THEN** an error message text is displayed below the input
- **AND** the error text uses the destructive color token

#### Scenario: Helper text is shown when no error

- **WHEN** a `helper` prop is provided and `error` is empty or absent
- **THEN** the helper text is displayed below the input in muted color

### Requirement: AppInput Emits Standard v-model Events

`AppInput` MUST support `v-model` two-way binding using the `modelValue` / `update:modelValue` pattern so consumers can bind it identically to a plain `InputText`.

#### Scenario: User types into AppInput

- **WHEN** the user types into the input
- **THEN** `update:modelValue` is emitted with the new string value

### Requirement: AppInput Accepts Native Input Attributes

`AppInput` MUST forward common native input attributes (`placeholder`, `maxlength`, `type`) to the underlying input so consumers can use them without custom props.

#### Scenario: Placeholder is forwarded

- **WHEN** a `placeholder` prop is provided
- **THEN** the underlying input shows the placeholder text when the value is empty

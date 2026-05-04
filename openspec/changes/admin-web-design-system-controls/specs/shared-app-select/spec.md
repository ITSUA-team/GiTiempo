# Shared AppSelect Component Specification

## Purpose

Define the behavior of the `AppSelect` shared select-field wrapper in `@gitiempo/web-shared` that enforces design-spec dimensions matching `AppInput`.

## Requirements

### Requirement: AppSelect Renders With Design-Spec Dimensions

`AppSelect` MUST render with `height:34px`, `padding:[0,12px]`, `cornerRadius:6px`, and a `$color-divider` border — identical to `AppInput` — so all form controls in a form appear visually consistent.

#### Scenario: AppSelect matches AppInput height

- **WHEN** `AppSelect` and `AppInput` are rendered side-by-side in the same form row
- **THEN** both controls have the same rendered height of `34px`
- **AND** both have the same horizontal padding of `12px`
- **AND** both have the same border radius of `6px`

### Requirement: AppSelect Forwards All Standard Select Props

`AppSelect` MUST transparently forward all standard PrimeVue `Select` props (`options`, `optionLabel`, `optionValue`, `placeholder`, `disabled`, `modelValue`) so consumers use it identically to `Select`.

#### Scenario: Standard Select usage

- **WHEN** `AppSelect` is used with `v-model`, `:options`, `option-label`, `option-value`
- **THEN** it behaves identically to PrimeVue `Select` with those props
- **AND** `update:modelValue` is emitted when the user selects an option

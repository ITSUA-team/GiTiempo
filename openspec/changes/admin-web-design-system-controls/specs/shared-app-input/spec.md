## MODIFIED Requirements

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

#### Scenario: Input dimensions match design spec

- **WHEN** `AppInput` is rendered
- **THEN** the rendered input has a computed height of `34px`
- **AND** the horizontal padding is `12px` on each side
- **AND** the border uses `$color-divider` color at `1px`
- **AND** the border-radius is `$radius-sm` (6px)

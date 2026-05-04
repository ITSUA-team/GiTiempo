## ADDED Requirements

### Requirement: AppSelect As Standard Form Select Primitive

Both `admin-web` and `user-web` MUST use `AppSelect` from `@gitiempo/web-shared` for labeled dropdown form fields rather than using raw PrimeVue `Select` directly, to ensure consistent dimensions with `AppInput`.

#### Scenario: Visibility field uses AppSelect

- **WHEN** the admin Add Project form renders the Visibility field
- **THEN** it uses `AppSelect` wrapped in `AppFormField`
- **AND** the rendered select has the same height as the Project name `AppInput` field

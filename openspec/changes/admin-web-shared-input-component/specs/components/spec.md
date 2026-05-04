## ADDED Requirements

### Requirement: AppInput As Standard Form Text Field Primitive

Both `admin-web` and `user-web` MUST use `AppInput` from `@gitiempo/web-shared` for text input form fields wherever a visible label is paired with a text input, rather than composing raw `<label>` + `InputText` inline.

#### Scenario: Form field uses AppInput

- **WHEN** a page or component renders a labeled text input
- **THEN** it uses `AppInput` from `@gitiempo/web-shared`
- **AND** it does not define an inline `<label>` + `InputText` boilerplate outside of `AppInput`

#### Scenario: AppInput used in AddProjectView

- **WHEN** the admin Add Project form renders the project name field
- **THEN** it uses `AppInput` with the correct `id`, `label`, and `v-model` props
- **AND** the rendered label and input match the design spec (fontSize:13, fontWeight:500 label; height:34 input)

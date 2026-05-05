## ADDED Requirements

### Requirement: AppSelect As Standard Form Select Primitive

Both `admin-web` and `user-web` MUST use `AppSelect` from
`@gitiempo/web-shared` for labeled dropdown form fields rather than using
raw PrimeVue `Select` directly, to ensure consistent dimensions with
`AppInput`.

#### Scenario: Visibility field uses AppSelect

- **WHEN** the admin Add Project form renders the Visibility field
- **THEN** it uses `AppSelect` wrapped in `AppFormField`
- **AND** the rendered select has the same height as the Project name
  `AppInput` field

### Requirement: PageHeader As Standard Page Header Primitive

Both `admin-web` and `user-web` MUST use `PageHeader` from
`@gitiempo/web-shared` for project-related page headers rather than using
`AdminPageHeader` or inline `<header>` blocks.

#### Scenario: Projects list page uses PageHeader

- **WHEN** `ProjectsView` renders
- **THEN** it uses `<PageHeader>` with `titleSize="xl"`
- **AND** the title, subtitle, and action slot render identically to the
  design in `pencil.mcp`

#### Scenario: Add Project page uses PageHeader with back button

- **WHEN** `AddProjectView` renders
- **THEN** it uses `<PageHeader>` with `back-label` prop set
- **AND** clicking the back button emits `back` and navigates to projects
  list

#### Scenario: User-web project pages use PageHeader

- **WHEN** any user-web view that previously used an inline `<header>`
  block renders
- **THEN** it uses `<PageHeader>` with `titleSize="lg"`
- **AND** the rendered output is pixel-accurate to the design in
  `pencil.mcp`

### Requirement: AddProjectForm Uses PrimeVue Primitives Only

`AddProjectForm` MUST use `AppInput`, `AppFormField`, `AppSelect`, and
PrimeVue `Button` exclusively — no raw `<label>` tags, no manual flex
wiring, no raw PrimeVue `Select`.

#### Scenario: Form renders all fields with correct primitives

- **WHEN** `AddProjectForm` renders
- **THEN** Project name uses `AppInput`
- **AND** Visibility uses `AppFormField` + `AppSelect`
- **AND** Source uses `AppFormField` + styled read-only `div`
- **AND** Project manager uses `AppFormField` + `AppSelect`
- **AND** all fields have identical height of `34px`

#### Scenario: Form submit state disables all fields

- **WHEN** the form is submitting
- **THEN** all `AppInput` and `AppSelect` fields have `:disabled="true"`
- **AND** the submit `Button` shows a loading spinner

### Requirement: Scan pencil.mcp Before Creating Any Shared Component

Before defining the props interface of any new shared component, ALL frames
in `pencil.mcp` MUST be scanned to find every screen that uses the visual
pattern — the props interface must cover all real usages found.

#### Scenario: PageHeader props validated against all frames

- **WHEN** `PageHeader` props are defined
- **THEN** every frame in `pencil.mcp` that contains a page header pattern
  has been scanned
- **AND** the `titleSize`, `subtitle`, `backLabel`, and slot API covers
  every variant found

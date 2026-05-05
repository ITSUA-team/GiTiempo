## ADDED Requirements

### Requirement: AppPageHeader renders a page-level heading block

The `AppPageHeader` component in `packages/web-shared` SHALL render a page-level heading that includes a required title, an optional subtitle, an optional back-link button, and a default slot for action buttons placed to the right of the title.

#### Scenario: Title only

- **WHEN** `AppPageHeader` is rendered with only the `title` prop
- **THEN** the heading text is visible and the subtitle, back-link, and action slot are absent

#### Scenario: Title and subtitle

- **WHEN** `AppPageHeader` is rendered with `title` and `subtitle` props
- **THEN** the subtitle text appears below the title

#### Scenario: Action slot populated

- **WHEN** content is placed in the default slot
- **THEN** it renders to the right of the title/subtitle block

#### Scenario: Back-link rendered

- **WHEN** the `backLabel` prop is provided
- **THEN** a back-link button labelled `← <backLabel>` appears above the title/subtitle row

#### Scenario: Back-link click emits event

- **WHEN** the back-link button is clicked
- **THEN** the component emits the `back` event with no payload

#### Scenario: Back-link absent when no backLabel

- **WHEN** `backLabel` is not provided
- **THEN** no back-link button is rendered

### Requirement: AppPageHeader supports two title sizes

`AppPageHeader` SHALL accept a `titleSize` prop (`'lg'` | `'xl'`, default `'xl'`) that controls the rendered font size of the title.

#### Scenario: Default title size is xl (28px)

- **WHEN** `AppPageHeader` is rendered without a `titleSize` prop
- **THEN** the title renders at 28px (Tailwind class `text-[28px]`)

#### Scenario: lg title size is 24px

- **WHEN** `AppPageHeader` is rendered with `titleSize="lg"`
- **THEN** the title renders at 24px (Tailwind class `text-2xl`)

### Requirement: AppPageHeader is exported from web-shared

`AppPageHeader` SHALL be importable from `@gitiempo/web-shared` via the components barrel export.

#### Scenario: Named import succeeds

- **WHEN** a consuming SPA imports `{ AppPageHeader }` from `@gitiempo/web-shared`
- **THEN** the import resolves without error and the component mounts correctly

### Requirement: admin-web uses AppPageHeader from web-shared

All usages of the local `AdminPageHeader` component in `apps/admin-web` SHALL be replaced with `AppPageHeader` from `@gitiempo/web-shared`, and `AdminPageHeader.vue` SHALL be deleted.

#### Scenario: Projects page header unchanged after migration

- **WHEN** the Projects view renders after migration
- **THEN** the page title, subtitle, and "New Project" action button appear identically to the pre-migration state

#### Scenario: Add Project page header unchanged after migration

- **WHEN** the Add Project view renders after migration
- **THEN** the page title, subtitle, and back-link appear identically to the pre-migration state

### Requirement: user-web uses AppPageHeader for page headings

All views in `apps/user-web` that currently inline the `<header class="flex flex-col gap-1.5"><h1 ...><p ...>` pattern SHALL be migrated to use `AppPageHeader` with `title-size="lg"`.

#### Scenario: Timer page heading unchanged after migration

- **WHEN** the Timer view renders after migration
- **THEN** the page title and subtitle appear identically to the pre-migration state

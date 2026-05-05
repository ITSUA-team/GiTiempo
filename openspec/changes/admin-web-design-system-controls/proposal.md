## Why

`AppInput` wraps `InputText` but does not enforce the design's `height:34px`
and `padding:[0,12]` reliably — PrimeVue's Aura preset overrides those values
through its own CSS. `Select` (used for Visibility in `AddProjectView`) has a
different default height and padding, making it visually inconsistent with text
inputs and read-only display fields. All four field types in the design are
meant to look identical: same `height:34`, same `cornerRadius:$radius-sm`,
same `stroke:$color-divider`, same `padding:[0,12]`.

`AdminPageHeader` is duplicated across `admin-web` and `user-web` — both apps
implement the same title + subtitle + optional back button + optional action
slot pattern independently. A single shared `ProjectPageHeader` component in
`@gitiempo/web-shared` eliminates the duplication.

`AddProjectForm` uses raw HTML `<label>` tags, manual flex wiring, and raw
PrimeVue `Select` — inconsistent with the shared form primitives
(`AppInput`, `AppSelect`, `AppFormField`) that enforce design-spec dimensions.

## What Changes

- Fix `AppInput.vue` — use PrimeVue PT to enforce `h-[34px]` and `px-3` on
  the InputText root element so PrimeVue's preset cannot override it.
- Add `AppSelect.vue` to `packages/web-shared` — a `Select` wrapper that
  applies the same PT overrides (`h-[34px]`, `px-3`, `rounded-[6px]`,
  `border-divider`) plus forwards all standard `Select` props via
  `v-bind="$attrs"`.
- Add `ProjectPageHeader.vue` to `packages/web-shared` — a shared page-level
  header component with props `title`, `subtitle?`, `backLabel?`,
  `titleSize?: 'lg'|'xl'`, emit `back`, and a default slot for action buttons.
  Replaces `AdminPageHeader` in `admin-web` and inline `<header>` blocks in
  `user-web`.
- Delete `apps/admin-web/src/components/layout/AdminPageHeader.vue`.
- Rewrite `AddProjectForm.vue` — replace raw `<label>` + `<Select>` wiring
  with `AppInput`, `AppFormField` + `AppSelect`, `AppFormField` + styled `div`,
  and PrimeVue `Button`. No manual label tags anywhere in the form.
- Update `AddProjectView.vue` — replace raw `<Select>` with `<AppSelect>`,
  wrap Source + Project manager read-only fields with `<AppFormField>`.
- Update `.agents/skills/admin-web-shared-components/SKILL.md` — document
  `AppSelect`, `ProjectPageHeader`, form field priority order, anti-pattern
  block, and the rule: before creating any shared component scan ALL frames
  in `pencil.mcp` for repeated visual patterns first.

## Capabilities

### New Capabilities

- `shared-app-select`: A shared `AppSelect` component that wraps PrimeVue
  `Select` with enforced design-spec dimensions (`height:34`, `radius:6px`,
  `border:$color-divider`, `padding:[0,12]`) matching `AppInput`.
- `shared-project-page-header`: A shared `ProjectPageHeader` component used
  on all project-related pages in both `admin-web` and `user-web` — renders
  title, optional subtitle, optional back button, and an action slot.

### Modified Capabilities

- `shared-app-input`: `AppInput` must enforce height/padding via PrimeVue PT,
  not just `style` attributes.
- `components`: Add `AppSelect` and `ProjectPageHeader` to the catalog of
  shared primitives.
- `add-project-form`: `AddProjectForm` rewritten to use PrimeVue form
  primitives exclusively — `AppInput`, `AppSelect`, `AppFormField`, `Button`.

## Impact

- `packages/web-shared/src/components/AppInput.vue` — PT override for
  height + padding
- `packages/web-shared/src/components/AppSelect.vue` — new file
- `packages/web-shared/src/components/ProjectPageHeader.vue` — new file
- `packages/web-shared/src/components/index.ts` — export `AppSelect`,
  `ProjectPageHeader`
- `apps/admin-web/src/components/projects/AddProjectForm.vue` — rewritten
  with PrimeVue primitives
- `apps/admin-web/src/components/layout/AdminPageHeader.vue` — deleted
- `apps/admin-web/src/views/ProjectsView.vue` — import `ProjectPageHeader`
  from `@gitiempo/web-shared`
- `apps/admin-web/src/views/AddProjectView.vue` — import
  `ProjectPageHeader`, use `AppSelect` for Visibility, `AppFormField` for
  Source/PM
- `apps/user-web` — all views with inline `<header>` pattern replaced with
  `ProjectPageHeader`
- `.agents/skills/admin-web-shared-components/SKILL.md` — document
  `AppSelect`, `ProjectPageHeader`, form field rules

## Why

`ProjectsView` inline edit uses raw `<div class="flex flex-col gap-1.5"><label ...>` wrappers around `MultiSelect` and `Select` — the same boilerplate pattern that `AppInput` solved for text inputs, but `AppInput` can't wrap non-text controls. A generic `AppFormField` wrapper (label + default slot) eliminates this repeated pattern and makes `ProjectsView` use the same code style as `AddProjectView`.

## What Changes

- Add `AppFormField.vue` to `packages/web-shared/src/components/` — a minimal label-above-slot wrapper with a `size` prop (`"sm"` = `fontSize:12` for compact inline forms, `"md"` = `fontSize:13` for standard forms).
- Export `AppFormField` from `@gitiempo/web-shared`.
- Update `ProjectsView` inline edit row to use `AppFormField` for the "Select members" and "Visibility" fields, removing the inline label div boilerplate.
- Update `.agents/skills/admin-web-shared-components/SKILL.md` to document `AppFormField`.

## Capabilities

### New Capabilities

- `shared-app-form-field`: A shared `AppFormField` label-above-slot wrapper usable for any control (Select, MultiSelect, DatePicker, etc.) in both compact (`size="sm"`) and standard (`size="md"`) form contexts.

### Modified Capabilities

- `components`: Add `AppFormField` to the catalog of shared primitives.

## Impact

- `packages/web-shared/src/components/AppFormField.vue` — new file
- `packages/web-shared/src/components/index.ts` — export `AppFormField`
- `apps/admin-web/src/views/ProjectsView.vue` — inline edit row uses `AppFormField`
- `.agents/skills/admin-web-shared-components/SKILL.md` — updated to document `AppFormField`

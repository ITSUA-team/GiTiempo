## Why

`AppInput` wraps `InputText` but does not enforce the design's `height:34px` and `padding:[0,12]` reliably — PrimeVue's Aura preset overrides those values through its own CSS. `Select` (used for Visibility in `AddProjectView`) has a different default height and padding, making it visually inconsistent with text inputs and read-only display fields. All four field types in the design are meant to look identical: same `height:34`, same `cornerRadius:$radius-sm`, same `stroke:$color-divider`, same `padding:[0,12]`.

## What Changes

- Fix `AppInput.vue` — use PrimeVue PT (`passthrough`) to enforce `h-[34px]` and `px-3` on the InputText root element so PrimeVue's preset cannot override it.
- Add `AppSelect.vue` to `packages/web-shared` — a `Select` wrapper that applies the same PT overrides (`h-[34px]`, `px-3`, `rounded-[6px]`, `border-divider`) plus forwards all standard `Select` props via `v-bind="$attrs"`.
- Update `AddProjectView.vue` — replace raw `<Select>` with `<AppSelect>`, and wrap the Source + Project manager read-only display fields with `<AppFormField>` for label consistency.
- Update `.agents/skills/admin-web-shared-components/SKILL.md` to document `AppSelect`.

## Capabilities

### New Capabilities

- `shared-app-select`: A shared `AppSelect` component that wraps PrimeVue `Select` with enforced design-spec dimensions (`height:34`, `radius:6px`, `border:$color-divider`, `padding:[0,12]`) matching `AppInput`.

### Modified Capabilities

- `shared-app-input`: `AppInput` must enforce height/padding via PrimeVue PT, not just `style` attributes.
- `components`: Add `AppSelect` to the catalog of shared primitives.

## Impact

- `packages/web-shared/src/components/AppInput.vue` — PT override for height + padding
- `packages/web-shared/src/components/AppSelect.vue` — new file
- `packages/web-shared/src/components/index.ts` — export `AppSelect`
- `apps/admin-web/src/views/AddProjectView.vue` — use `AppSelect` for Visibility, `AppFormField` for Source/PM
- `.agents/skills/admin-web-shared-components/SKILL.md` — document `AppSelect`

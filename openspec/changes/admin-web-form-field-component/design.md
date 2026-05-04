## Context

`AppInput` (from the previous change) wraps PrimeVue `InputText` with a label. But many form fields use `Select`, `MultiSelect`, or `DatePicker` — components that can't be wrapped by `AppInput`. The inline edit row in `ProjectsView` has two such fields, each with inline `<div class="flex flex-col gap-1.5"><label ...>` boilerplate.

The design uses two label sizes:

- **Standard forms** (AddProjectView, dialogs): `fontSize:13, fontWeight:500`
- **Compact inline forms** (ProjectsView inline edit): `fontSize:12, fontWeight:500`

`AppFormField` needs a `size` prop to cover both contexts cleanly.

## Goals / Non-Goals

**Goals:**

- `AppFormField` — a label + default slot wrapper with `size="sm"` (12px) and `size="md"` (13px, default)
- Use it in `ProjectsView` inline edit for `MultiSelect` and `Select`
- Document it in the shared-components skill

**Non-Goals:**

- Replacing `AppInput` — `AppInput` stays for text inputs (`v-model` + forwarded attributes make it more ergonomic for that case)
- Adopting `AppFormField` across `user-web` in this change
- Error/helper text on `AppFormField` — those belong on `AppInput` where validation state is naturally coupled

## Decisions

### Decision: `size` prop drives label font size, not a separate `labelClass` prop

A `size` enum (`"sm" | "md"`) is more intention-revealing and less error-prone than exposing a raw class override. The only consumer-visible difference is label font size (12px vs 13px); both use `fontWeight:500` and `$color-text-dark`.

### Decision: `AppFormField` uses default slot, not a named `control` slot

A single default slot is the least-ceremony API for wrapping one control. If a field ever needs multi-control layout it can compose two `AppFormField` instances side-by-side.

## Risks / Trade-offs

- [Risk] Two-component system (`AppInput` for text, `AppFormField` for others) adds surface area → Mitigation: skill file clearly documents when to use which.

## Migration Plan

1. Add `AppFormField.vue` to `packages/web-shared/src/components/`
2. Export from `index.ts`
3. Replace inline label wrappers in `ProjectsView` inline edit
4. Update skill file
5. Lint + typecheck + build

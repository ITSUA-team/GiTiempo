## Why

The admin-web forms currently use raw PrimeVue `InputText` and ad-hoc inline styling inconsistently: labels use mixed font sizes (12px vs 13px), no shared wrapper exists, and the `AddProjectView` still deviates from the Pencil design. Introducing a shared `AppInput` form-field component establishes a single, design-spec-compliant input primitive reused across all admin and user-web forms.

## What Changes

- Introduce `AppInput.vue` in `packages/web-shared/src/components/` — a wrapper component that pairs a label, a PrimeVue `InputText`, and an optional helper/error text slot, sized and styled to the design system spec (`height:34`, `fontSize:13` label, `$radius-sm` border-radius, `$color-divider` border).
- Update `AddProjectView.vue` in `apps/admin-web` to use `AppInput` for the "Project name" field, eliminating the inline label+input boilerplate.
- Export `AppInput` from `@gitiempo/web-shared` so `user-web` can adopt it incrementally.
- Create a project-level skill `admin-web-shared-components` that documents when and how to use shared component primitives (`AppInput`, future `AppSelect`, etc.) so agents follow a consistent pattern.

## Capabilities

### New Capabilities

- `shared-app-input`: A shared `AppInput` form-field wrapper component in `packages/web-shared`, covering label, input, helper text, error state, and disabled state — pixel-perfect to the design spec.

### Modified Capabilities

- `components`: Add `AppInput` to the catalog of shared reusable primitives that both SPAs must use for text inputs in forms.

## Impact

- `packages/web-shared/src/components/AppInput.vue` — new file
- `packages/web-shared/src/index.ts` — export `AppInput`
- `apps/admin-web/src/views/AddProjectView.vue` — replace inline label+InputText with `AppInput`
- `.agents/skills/admin-web-shared-components/SKILL.md` — new skill file documenting shared component conventions

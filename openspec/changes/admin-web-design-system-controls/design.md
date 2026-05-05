## Context

PrimeVue v4 with Aura preset renders `InputText` and `Select` with its own
CSS class-based sizing. Our `AppInput` currently uses `style="height: 34px"`
which works for the root element but may not override PrimeVue's inner
padding. `Select` has its own default height (typically ~38-40px in Aura)
and its own padding, making it taller than the design's `34px` fields.

The design spec requires every form control in `AddProjectView` to share
identical dimensions:

- `height: 34px`
- `cornerRadius: $radius-sm` (6px)
- `stroke: $color-divider` (1px)
- `padding: [0, 12px]`
- `fontSize: 14px, fontWeight: 500, color: $text-dark` for the value text

PrimeVue v4 supports `pt` (Pass-Through) props that inject classes/styles
directly onto internal DOM elements, bypassing the preset — this is the
correct mechanism.

`AdminPageHeader` in `admin-web` and the inline `<header>` blocks in
`user-web` implement the same visual pattern: a page title, optional
subtitle, optional back button, and an optional action slot on the right.
Before defining the `ProjectPageHeader` API, all frames in `pencil.mcp`
must be scanned to find every screen that uses this pattern and confirm the
props interface covers all real usages.

`AddProjectForm` currently uses raw HTML `<label>` tags and manual flex
layout (`<div class="flex flex-col gap-1">`) instead of `AppFormField`, and
uses raw PrimeVue `Select` instead of `AppSelect`. This bypasses the
design-system enforcement that `AppFormField` and `AppSelect` provide.

## Goals / Non-Goals

**Goals:**

- `AppInput` uses PT to enforce `h-[34px] px-3` on the InputText root
- `AppSelect` wraps `Select` with PT overrides for height, padding, radius,
  border — visually identical to `AppInput`
- `ProjectPageHeader` is a single shared component used on every
  project-related page in both apps — no more `AdminPageHeader` or inline
  header blocks
- `AddProjectForm` uses only PrimeVue primitives via `AppInput`,
  `AppFormField`, `AppSelect`, `Button` — zero manual label/flex wiring
- All form field areas look pixel-perfect to the design
- Before any shared component is created: scan ALL frames in `pencil.mcp`
  for repeated visual patterns

**Non-Goals:**

- `AppMultiSelect` — the inline edit MultiSelect in `ProjectsView` is
  compact and styled differently; skip for this change
- Changing any API or backend code

## Decisions

### Decision: PrimeVue PT over global CSS override

PT targets the specific component's root DOM element with Tailwind classes,
giving us deterministic sizing without fighting specificity battles or
risking regressions in other PrimeVue components.

**Alternative considered**: Override via `primevue.ts` preset tokens —
rejected because the Aura preset's token names for InputText/Select height
are not straightforward and a global override would affect all Select
instances including DataTable filters, etc.

### Decision: `AppSelect` is a thin wrapper, not a reimplemented dropdown

`AppSelect` passes all props through via `v-bind="$attrs"` and simply
applies PT. This means consumers use the same props (`option-label`,
`option-value`, `options`, `v-model`, `disabled`, `placeholder`) they're
used to — zero API difference from `Select`.

### Decision: Read-only display fields use `AppFormField` + inline div,

not a new component

The Source and Project manager fields are static text — no interactive
state, no `v-model`. A dedicated component would be over-engineering.
`AppFormField` provides the label; a styled `div` provides the display
value.

### Decision: `ProjectPageHeader` lives in `packages/web-shared`

The component is used on project-related pages in both `admin-web` and
`user-web`. Placing it in `web-shared` removes the duplication and makes
it available to any future app in the monorepo. The component name
`ProjectPageHeader` (not `PageHeader`) signals its domain scope.

### Decision: Scan `pencil.mcp` before defining any shared component API

The props interface of every shared component must be validated against all
real design usages before implementation — not after. This prevents
prop-interface mismatches discovered late in review.

## Risks / Trade-offs

- [Risk] PT class injection may conflict with PrimeVue's unstyled mode in
  future → Low risk: this project uses styled mode only.
- [Risk] `AppSelect`'s PT may need to target different internal element
  names in future PrimeVue versions → Mitigation: document in skill file.
- [Risk] `ProjectPageHeader` `titleSize` prop may not cover all design
  variants → Mitigation: step 4.1 in tasks requires full frame scan in
  `pencil.mcp` before implementation.

## Migration Plan

1. Sync design tokens from `pencil.mcp`
2. Fix `AppInput.vue` PT
3. Create `AppSelect.vue`, export from `index.ts`
4. Scan `pencil.mcp` for all `ProjectPageHeader` usages
5. Create `ProjectPageHeader.vue`, export from `index.ts`
6. Replace `AdminPageHeader` and inline header blocks in both apps
7. Delete `AdminPageHeader.vue`
8. Rewrite `AddProjectForm.vue` with PrimeVue primitives
9. Update skill file
10. Lint + typecheck + build + visual verify via `pencil.mcp`

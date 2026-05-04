## Context

PrimeVue v4 with Aura preset renders `InputText` and `Select` with its own CSS class-based sizing. Our `AppInput` currently uses `style="height: 34px"` which works for the root element but may not override PrimeVue's inner padding. `Select` has its own default height (typically ~38-40px in Aura) and its own padding, making it taller than the design's `34px` fields.

The design spec requires every form control in `AddProjectView` to share identical dimensions:

- `height: 34px`
- `cornerRadius: $radius-sm` (6px)
- `stroke: $color-divider` (1px)
- `padding: [0, 12px]`
- `fontSize: 14px, fontWeight: 500, color: $text-dark` for the value text

PrimeVue v4 supports `pt` (Pass-Through) props that inject classes/styles directly onto internal DOM elements, bypassing the preset — this is the correct mechanism.

## Goals / Non-Goals

**Goals:**

- `AppInput` uses PT to enforce `h-[34px] px-3` on the InputText root
- `AppSelect` wraps `Select` with PT overrides for height, padding, radius, border — visually identical to `AppInput`
- `AddProjectView` uses `AppSelect` for Visibility and `AppFormField` for Source/PM read-only fields
- All four field areas look pixel-perfect to the design

**Non-Goals:**

- `AppMultiSelect` — the inline edit MultiSelect in `ProjectsView` is compact and styled differently; skip for this change
- Changing any API or backend code
- Adoption in `user-web`

## Decisions

### Decision: PrimeVue PT over global CSS override

PT targets the specific component's root DOM element with Tailwind classes, giving us deterministic sizing without fighting specificity battles or risking regressions in other PrimeVue components.

**Alternative considered**: Override via `primevue.ts` preset tokens — rejected because the Aura preset's token names for InputText/Select height are not straightforward and a global override would affect all Select instances including DataTable filters, etc.

### Decision: `AppSelect` is a thin wrapper, not a reimplemented dropdown

`AppSelect` passes all props through via `v-bind="$attrs"` and simply applies PT. This means consumers use the same props (`option-label`, `option-value`, `options`, `v-model`, `disabled`, `placeholder`) they're used to — zero API difference from `Select`.

### Decision: Read-only display fields use `AppFormField` + inline div, not a new component

The Source and Project manager fields are static text — no interactive state, no `v-model`. A dedicated component would be over-engineering. `AppFormField` provides the label; a styled `div` provides the display value.

## Risks / Trade-offs

- [Risk] PT class injection may conflict with PrimeVue's unstyled mode in future → Low risk: this project uses styled mode only.
- [Risk] `AppSelect`'s PT may need to target different internal element names in future PrimeVue versions → Mitigation: document in skill file.

## Migration Plan

1. Fix `AppInput.vue` PT
2. Create `AppSelect.vue`
3. Export from `index.ts`
4. Update `AddProjectView.vue`
5. Update skill file
6. Lint + typecheck + build

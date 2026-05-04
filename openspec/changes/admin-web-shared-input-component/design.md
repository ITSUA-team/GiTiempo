## Context

`packages/web-shared` already exports shared Vue components (`AuthSignInForm`, `WorkspaceHeader`, etc.) used by both SPAs. Currently, `admin-web` form fields are written inline: a raw `<label>` + PrimeVue `<InputText>` wrapped in a div — repeated in `AddProjectView`, `ProjectsView` (inline edit), and potentially in `user-web` forms. There is no single source of truth for the label font size (13px per design), border-radius token (`$radius-sm`), or height (34px per design). This creates drift risk.

The design spec (Pencil nodes `O1sgr`, `QjR0g`) shows a consistent field pattern: `fontSize:13 fontWeight:500` label, `height:34` input with `stroke:$color-divider, cornerRadius:$radius-sm, padding:[0,12]`.

## Goals / Non-Goals

**Goals:**

- Create `AppInput.vue` in `packages/web-shared` — a labeled text-input wrapper matching the design spec exactly
- Export it from `@gitiempo/web-shared` so both SPAs can use it
- Replace inline label+InputText boilerplate in `AddProjectView.vue` with `AppInput`
- Create `.agents/skills/admin-web-shared-components/SKILL.md` documenting the shared component conventions for agents

**Non-Goals:**

- Replacing all `InputText` usages across both SPAs in this change (incremental adoption)
- Creating a `AppSelect` or other form primitives in this change
- Changing any API contracts or backend code

## Decisions

### Decision: `AppInput` wraps PrimeVue `InputText`, does not replace it

PrimeVue `InputText` provides baseline theming (focus ring, disabled state, PrimeVue PT system). `AppInput` wraps it with the label/error-text pattern rather than reimplementing the input itself. This keeps PrimeVue as the styling source of truth.

**Alternative considered**: Raw `<input>` with Tailwind — rejected because it bypasses PrimeVue's theme tokens and global config (e.g., `unstyled` mode or PT overrides).

### Decision: Props over slots for label and error

Label text and error message are string props. The input element itself is passed via the default slot. This keeps the API minimal and type-safe without over-engineering (no headless pattern needed at this scale).

**Alternative considered**: Fully slot-based (label slot + input slot) — rejected as too verbose for simple use cases; string props cover 95% of cases cleanly.

### Decision: `id` prop required for label `for` attribute

`AppInput` requires an `id` prop to wire `<label for="...">` correctly for accessibility. The consumer sets it; the component does not auto-generate IDs to keep SSR safe and avoid `useId` dependency.

### Decision: Skill file in `.agents/skills/`, not `docs/`

Agent-facing rules belong in `.agents/skills/` following the existing project convention (see `gitiempo-frontend-rules`). This makes it loadable by the `skill` tool.

## Risks / Trade-offs

- [Risk] `user-web` forms are not updated in this change, creating temporary inconsistency → Mitigation: document `AppInput` as the target pattern; `user-web` adoption is a follow-up.
- [Risk] PrimeVue `InputText` sizing may conflict with `h-[34px]` if PrimeVue injects its own height → Mitigation: use `pt` (pass-through) or `style` override on the InputText root to enforce `height:34px`.

## Migration Plan

1. Add `AppInput.vue` to `packages/web-shared/src/components/`
2. Export from `packages/web-shared/src/components/index.ts`
3. Replace inline field in `AddProjectView.vue`
4. Add skill file
5. Lint + typecheck both apps

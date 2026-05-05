## 0. Design reference sync

- [x] 0.1 Open `pencil.mcp` — fetch `GITiempo.pen`, locate frames:
      `Admin / Projects`, `Admin / Add Project`, `User / Timer`
- [x] 0.2 Extract from each frame: title font size/weight/color,
      subtitle font size/color, back button style, spacing tokens
- [x] 0.3 Save extracted values as reference for all implementation steps

## 1. Audit call sites before touching code

- [x] 1.1 `grep -r "AdminPageHeader" apps/ --include="*.vue" -l`
      — list every file that uses AdminPageHeader
- [x] 1.2 `grep -r "flex flex-col gap-1.5" apps/ --include="*.vue" -l`
      — list every file with inline header pattern
- [x] 1.3 Cross-check every found file against design from step 0.2

## 2. Document existing pages

- [x] 2.1 Read `apps/admin-web/src/views/ProjectsListView.vue` — produce
      component tree, props/emits/v-model for each component, UX flow
- [x] 2.2 Read `apps/admin-web/src/views/AddProjectView.vue` — same output
- [x] 2.3 Write output to `.agents/docs/admin-web-projects-list.md`
      and `.agents/docs/admin-web-add-project.md`

## 3. Audit repeated components

- [x] 3.1 Scan `apps/admin-web/src/components/` and
      `apps/user-web/src/components/` — list every component that exists
      in both apps or is inlined repeatedly across multiple views
- [x] 3.2 For each duplicate: list file paths, diff what differs,
      propose unified props interface
- [x] 3.3 Write output to `.agents/docs/shared-components-audit.md`

## 4. Create AppPageHeader — shared reusable component

- [x] 4.1 Open `pencil.mcp` — scan ALL frames in `GITiempo.pen` and find
      every screen that contains a page header pattern (title + subtitle +
      optional back button + optional action slot) — list all found frames
- [x] 4.2 Compare all found instances from step 4.1 — extract the common
      props pattern, note any visual differences between screens
- [x] 4.3 Create `packages/web-shared/src/components/AppPageHeader.vue`
      with props: - `title: string` (required) - `subtitle?: string` - `backLabel?: string` - `titleSize?: 'lg' | 'xl'` (default `'xl'`) - emit `back: []` - default slot for action buttons
- [x] 4.4 Render title at `text-[28px]` when `titleSize === 'xl'` and
      `text-2xl` when `titleSize === 'lg'`;
      `text-text-dark font-semibold leading-none` —
      **verify every variant against all frames found in step 4.1**
- [x] 4.5 Render back-link using PrimeVue `Button`
      (`variant="text"`, `severity="primary"`,
      `pt:label:class="font-bold text-[#5d2b85] text-[13px]"`)
      when `backLabel` is present —
      **verify against all frames found in step 4.1**
- [x] 4.6 Render subtitle `text-text-muted text-sm` when present —
      **verify against all frames found in step 4.1**
- [x] 4.7 Export `ProjectPageHeader` from
      `packages/web-shared/src/components/index.ts`
- [x] 4.8 Replace `AdminPageHeader` in every file from step 1.1 with
      `import { ProjectPageHeader } from '@gitiempo/web-shared'`
- [x] 4.9 Replace inline `<header>` blocks from step 1.2 with
      `<ProjectPageHeader />`
- [x] 4.10 Delete `apps/admin-web/src/components/layout/AdminPageHeader.vue`
- [x] 4.11 Run `pnpm --filter admin-web typecheck` — no errors
- [x] 4.12 Run `pnpm --filter user-web typecheck` — no errors

## 5. Fix AppInput dimensions

- [x] 5.1 Update `packages/web-shared/src/components/AppInput.vue` —
      replace `style="height: 34px"` with PT:
      `:pt="{ root: { class: 'h-[34px] px-3 !rounded-[6px] !border-divider' } }"`
      **verify height against design from step 0.2**
- [x] 5.2 Run `pnpm --filter @gitiempo/web-shared typecheck`

## 6. Create AppSelect component

- [x] 6.1 Create `packages/web-shared/src/components/AppSelect.vue` —
      thin wrapper around PrimeVue `Select` with `v-bind="$attrs"` and PT:
      `h-[34px] px-3 rounded-[6px] border-divider`
- [x] 6.2 Export `AppSelect` from
      `packages/web-shared/src/components/index.ts`
- [x] 6.3 Run `pnpm --filter @gitiempo/web-shared typecheck`

## 7. Rewrite AddProjectForm using PrimeVue primitives

- [x] 7.1 Open `pencil.mcp` — fetch `Admin / Add Project` frame, scan ALL
      frames in `GITiempo.pen` for repeated form patterns (label + input,
      label + select, read-only field) — list every screen where this
      pattern appears
- [x] 7.2 Extract from `Admin / Add Project` frame: every field type,
      label, placeholder, validation rules, layout (width, gaps, alignment)
- [x] 7.3 Rewrite `apps/admin-web/src/components/projects/AddProjectForm.vue`
      using PrimeVue form primitives: - Project name → `AppInput` (v-model, label, validation) - Visibility → `AppFormField` + `AppSelect` - Source → `AppFormField` + styled `div` (read-only "Manual") - Project manager → `AppFormField` + `AppSelect` - Submit / Cancel → PrimeVue `Button`
- [x] 7.4 Each field wrapped in `AppFormField` — no manual `<label>` tags,
      no raw `<div class="flex flex-col gap-1">` wiring
- [x] 7.5 Validation errors rendered via PrimeVue `Message` or
      `AppFormField` error prop — not custom divs
- [x] 7.6 Loading/submitting state: `:disabled="isSubmitting"` on all
      fields, `Button` shows spinner when submitting
- [x] 7.7 Verify form layout pixel-accurate against all frames from
      step 7.1 via `pencil.mcp`
- [x] 7.8 Run `pnpm --filter admin-web lint --fix &&
pnpm --filter admin-web typecheck`

## 8. Update skill file

- [x] 8.1 Add `ProjectPageHeader` live documentation to
      `.agents/skills/admin-web-shared-components/SKILL.md` —
      props table, import, usage examples, when-to-use/not-use;
      **rule: before creating any new shared component — scan ALL frames
      in `pencil.mcp` for repeated visual patterns first**
- [x] 8.2 Add form field priority order: 1. `AppInput` — text fields 2. `AppSelect` inside `AppFormField` — dropdowns 3. `AppFormField` + styled `div` — read-only display fields 4. Raw PrimeVue — only outside forms (table filters etc.)
- [x] 8.3 Add anti-pattern block (❌ raw Select / ✅ AppSelect+AppFormField)
- [x] 8.4 Add PT implementation detail for `AppSelect` and `AppInput`

## 9. Final verification

- [x] 9.1 Run `pnpm --filter @gitiempo/web-shared typecheck` — no errors
- [x] 9.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
      — no errors
- [x] 9.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
      — no errors
- [x] 9.4 Run `pnpm --filter admin-web build` — zero errors
- [ ] 9.5 Open `pencil.mcp` — fetch all frames from step 4.1 and step 7.1;
      compare side-by-side with browser — pixel-accurate to design

## 10. Agent knowledge updates (harvested from implementation)

Two patterns proven in this change warrant durable guidance.

### 10.1 Fix `value` → `values` typo in global forms reference

- [x] 10.1 Edit `.agents/skills/primevue-styled-tailwind/references/forms.md`
      line 230: change `{ valid, errors, states, reset, value }` to
      `{ valid, errors, states, reset, values }` — the field is `values`,
      not `value`; both working implementations (`AuthSignInForm.vue` and
      `AddProjectForm.vue`) confirm this, and the `FormSubmitEvent` type
      in `@primevue/forms/form/index.d.ts` also declares `values`

### 10.2 Add Zod form validation section to shared-components skill

Canonical examples (do not change these files — read them):

- `packages/web-shared/src/validation/auth.ts`
- `packages/web-shared/src/components/AuthSignInForm.vue`
- `apps/admin-web/src/validation/projects.ts`
- `apps/admin-web/src/components/projects/AddProjectForm.vue`

- [x] 10.2 Add a new section **"Forms with Zod Validation"** to
      `.agents/skills/admin-web-shared-components/SKILL.md` immediately
      after the existing "Form Field Priority Order" section. The section
      must cover:

  **Schema placement rules**
  - App-local schemas → `apps/<app>/src/validation/<feature>.ts`
  - Schemas for `packages/web-shared` components → `packages/web-shared/src/validation/`
  - Schemas shared between frontend and backend → `packages/shared/src/contracts/`
    (backend-safe only; never put browser-only schemas there)

  **Type derivation rule**
  - Always export the form value type as `z.infer<typeof schema>` — never
    declare the interface manually alongside a Zod schema

  **Wiring pattern** (show full TypeScript snippet matching `AddProjectForm.vue`)

  ```ts
  import { zodResolver } from '@primevue/forms/resolvers/zod';
  import { mySchema, type MyFormValues } from '@/validation/my-feature';

  const resolver = zodResolver(mySchema);

  function handleSubmit(event: {
    valid: boolean;
    values: Record<string, unknown>;
  }) {
    if (!event.valid) return;
    const result = mySchema.safeParse(event.values);
    if (result.success) emit('submit', result.data);
  }
  ```

  **Gotchas block** (required — this caused a runtime crash)
  - `event.values` is populated only when `zodResolver` is used; without it
    `event.values` is `undefined` and values must be read from `states`
  - Do NOT use `FormSubmitEvent` from `@primevue/forms/form` as the handler
    parameter type — use an inline annotation to avoid confusion with the
    stale `value` field that appears in older type definitions
  - `AppSelect` forwards `$attrs`, so `v-bind="$field.props"` on `AppSelect`
    registers the field with the form; a bare `name` attribute does not

  **Anti-pattern block**

  ```ts
  // ❌ reading from states when zodResolver is present
  name: states.name?.value as string;

  // ✅ correct
  const result = mySchema.safeParse(event.values);

  // ❌ manual interface next to a schema
  export interface MyFormValues {
    name: string;
  }

  // ✅ correct
  export type MyFormValues = z.infer<typeof mySchema>;
  ```

- [x] 10.3 Run `pnpm --filter admin-web typecheck && pnpm --filter user-web typecheck`
      after both edits — no errors expected (skill files are markdown,
      typecheck confirms no collateral damage to imported files)

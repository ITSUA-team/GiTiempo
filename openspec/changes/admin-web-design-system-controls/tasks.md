## 1. Fix AppInput Dimensions

- [x] 1.1 Update `packages/web-shared/src/components/AppInput.vue` — replace `style="height: 34px"` with PrimeVue PT: add `:pt="{ root: { class: 'h-[34px] px-3 !rounded-[6px] !border-divider' } }"` on the `InputText` element so PrimeVue's preset cannot override height, padding, radius, or border color
- [x] 1.2 Run `pnpm --filter @gitiempo/web-shared typecheck`

## 2. AppSelect Component

- [x] 2.1 Create `packages/web-shared/src/components/AppSelect.vue` — wraps PrimeVue `Select` with `v-bind="$attrs"` and `:pt` to enforce design-spec dimensions
- [x] 2.2 Export `AppSelect` from `packages/web-shared/src/components/index.ts`
- [x] 2.3 Run `pnpm --filter @gitiempo/web-shared typecheck`

## 3. AddProjectView Integration

- [x] 3.1 In `apps/admin-web/src/views/AddProjectView.vue`, replace raw `<Select>` Visibility field with `<AppFormField label="Visibility"><AppSelect .../></AppFormField>`
- [x] 3.2 Replace the inline label divs for Source and Project manager with `<AppFormField label="...">` wrapping the read-only display div
- [x] 3.3 Run `pnpm --filter admin-web lint --fix && pnpm --filter admin-web typecheck`

## 4. Skill Update

- [x] 4.1 Add `AppSelect` documentation to `.agents/skills/admin-web-shared-components/SKILL.md`

## 5. Final Verification

- [x] 5.1 Run `pnpm --filter user-web typecheck`
- [x] 5.2 Run `pnpm --filter admin-web build` — confirm zero errors

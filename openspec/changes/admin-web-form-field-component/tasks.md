## 1. AppFormField Component

- [x] 1.1 Create `packages/web-shared/src/components/AppFormField.vue` — label-above-slot wrapper with `label: string` and `size?: 'sm' | 'md'` props; `size="md"` (default) uses `text-[13px]`, `size="sm"` uses `text-[12px]`; both use `font-medium text-text-dark`; gap between label and slot is `gap-1.5` (6px)
- [x] 1.2 Export `AppFormField` from `packages/web-shared/src/components/index.ts`
- [x] 1.3 Run `pnpm --filter @gitiempo/web-shared typecheck`

## 2. ProjectsView Integration

- [x] 2.1 Import `AppFormField` in `apps/admin-web/src/views/ProjectsView.vue`
- [x] 2.2 Replace inline label div for "Select members" with `<AppFormField label="Select members" size="sm">`
- [x] 2.3 Replace inline label div for "Visibility" with `<AppFormField label="Visibility" size="sm">`
- [x] 2.4 Run `pnpm --filter admin-web lint --fix && pnpm --filter admin-web typecheck`

## 3. Skill Update

- [x] 3.1 Add `AppFormField` documentation to `.agents/skills/admin-web-shared-components/SKILL.md`

## 4. Final Verification

- [x] 4.1 Run `pnpm --filter user-web typecheck`
- [x] 4.2 Run `pnpm --filter admin-web build` — confirm zero errors

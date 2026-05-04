## 1. AddProjectForm Visual Fixes

- [x] 1.1 In `apps/admin-web/src/components/projects/AddProjectForm.vue`, change the root card class from `p-4` to `p-5`
- [x] 1.2 Add `size="sm"` to the `<AppFormField label="Source">` instance in `AddProjectForm.vue`
- [x] 1.3 Add `size="sm"` to the `<AppFormField label="Project manager">` instance in `AddProjectForm.vue`
- [x] 1.4 Add `size="sm"` to the `<AppFormField label="Visibility">` instance in `AddProjectForm.vue`

## 2. Dead Code Removal

- [x] 2.1 Delete `apps/admin-web/src/components/projects/ProjectSourceCard.vue`

## 3. Documentation Update

- [x] 3.1 In `docs/ui/pages-admin.md`, replace the line «Manual project creation uses a dialog.» with «Manual project creation uses a dedicated route (`AddProjectView`).»

## 4. Verification

- [x] 4.1 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck` — confirm zero errors

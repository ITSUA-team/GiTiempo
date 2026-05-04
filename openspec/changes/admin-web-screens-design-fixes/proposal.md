## Why

The `AddProjectView.vue` form card and field labels deviate from the approved Pencil design: card padding is `p-4` instead of the required `p-5`, form field labels render at `text-[13px]` instead of `text-[12px]`, and a dead `ProjectSourceCard.vue` component remains in the codebase after the previous decomposition. Additionally, `docs/ui/pages-admin.md` still states "Manual project creation uses a dialog" — conflicting with the current dedicated-page implementation and creating a drift risk for future agents.

## What Changes

- Fix `AddProjectForm.vue` card padding: `p-4` → `p-5` to match Pencil design `padding:20`
- Fix `AddProjectForm.vue` field label typography: add `size="sm"` to all `AppFormField` instances so labels render at `text-[12px] font-medium` per the design spec
- Delete dead file `src/components/projects/ProjectSourceCard.vue` (component removed from render tree but file remains)
- Update `docs/ui/pages-admin.md` to reflect the accepted decision: manual project creation uses a dedicated route (`AddProjectView`), not a dialog

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `admin-pages`: Form card padding and label typography on the Add Project page now match the approved design. Documentation updated to reflect page-based creation flow.

## Impact

- `apps/admin-web/src/components/projects/AddProjectForm.vue` — padding and label size corrections
- `apps/admin-web/src/components/projects/ProjectSourceCard.vue` — deleted
- `docs/ui/pages-admin.md` — line 36 updated: dialog → dedicated route

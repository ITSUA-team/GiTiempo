## 1. Root Overlay Hosts

- [x] 1.1 Update `apps/user-web/src/App.vue` to import and render one root `<ConfirmDialog>` beside the existing root `<Toast>` before routed content.
- [x] 1.2 Preserve the existing user-web Toast `position="top-right"` and `w-80` root pass-through configuration.
- [x] 1.3 Update `apps/admin-web/src/App.vue` to import and render one root `<Toast>` and one root `<ConfirmDialog>` before routed content.
- [x] 1.4 Apply the same top-right Toast position and `w-80` root pass-through configuration in admin-web.

## 2. Duplicate Host Removal

- [x] 2.1 Remove Toast and ConfirmDialog host imports/rendering from `apps/admin-web/src/components/layout/AdminAppShell.vue` while keeping existing feedback composable usage intact.
- [x] 2.2 Remove page-level ConfirmDialog host imports/rendering from `apps/user-web/src/views/ProfileView.vue` while keeping existing profile feedback behavior intact.
- [x] 2.3 Remove page-level ConfirmDialog host imports/rendering from `apps/user-web/src/views/ProjectView.vue` while keeping existing project/task confirmation behavior intact.
- [x] 2.4 Remove page-level ConfirmDialog host imports/rendering from `apps/user-web/src/views/TimeEntriesView.vue` while keeping existing time-entry confirmation behavior intact.
- [x] 2.5 Search `apps/user-web` and `apps/admin-web` for remaining `<Toast>`, `<ConfirmDialog>`, `primevue/toast`, and `primevue/confirmdialog` usage and confirm only root `App.vue` files render service hosts.

## 3. Verification

- [x] 3.1 Review destructive confirmation flows in touched user-web pages to confirm they still call existing `useConfirm()` or shared confirmation helpers.
- [x] 3.2 Review admin public and login route composition to confirm root overlay hosts wrap LoginView and authenticated admin routes.
- [x] 3.3 Update any affected frontend tests that previously expected shell-local or page-local overlay hosts.
- [x] 3.4 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 3.5 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck`.

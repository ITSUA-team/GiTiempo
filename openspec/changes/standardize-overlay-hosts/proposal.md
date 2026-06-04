## Why

PrimeVue Toast and ConfirmDialog hosts are mounted at different levels across the two SPAs, which makes feedback behavior depend on whether the user is on a public page, authenticated shell, or individual route. Standardizing these hosts at each app root removes duplicated overlay infrastructure and ensures login, authenticated, and page-level flows use the same lifecycle.

## What Changes

- Mount one PrimeVue `<Toast>` host and one `<ConfirmDialog>` host in the root `App.vue` of `apps/user-web`.
- Mount one PrimeVue `<Toast>` host and one `<ConfirmDialog>` host in the root `App.vue` of `apps/admin-web`.
- Preserve the documented top-right toast position and `w-80` target width for both SPAs.
- Remove duplicate Toast and ConfirmDialog host imports/rendering from app shells and route/page-level views.
- Keep existing `useToast()`, `useConfirm()`, shared feedback helpers, and feature-level confirmation/toast call sites intact.

## Capabilities

### New Capabilities
- `frontend-overlays`: Defines cross-SPA ownership and behavior for global PrimeVue Toast and ConfirmDialog service hosts.

### Modified Capabilities

## Impact

- Affected apps: `apps/user-web` and `apps/admin-web`.
- Affected files include root `App.vue` files, admin authenticated shell overlay host usage, user route-level ConfirmDialog host usage, and `docs/ui/patterns.md` overlay ownership guidance.
- No backend API, shared contract, database, or dependency changes are expected.
- Verification should cover both web apps because the change touches cross-SPA frontend infrastructure.

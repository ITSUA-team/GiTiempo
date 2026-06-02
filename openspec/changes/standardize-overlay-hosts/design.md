## Context

`apps/user-web/src/App.vue` currently mounts the PrimeVue Toast host at the root with the documented top-right position and `w-80` width target, while ConfirmDialog hosts are rendered inside individual route views such as Profile, Projects, and Time Entries. `apps/admin-web/src/App.vue` only renders the router view, and `AdminAppShell.vue` mounts both Toast and ConfirmDialog inside the authenticated shell.

This creates two lifecycle models. User-web confirmations depend on page-local hosts, while admin-web feedback depends on the authenticated shell and is unavailable to routes that do not render that shell, including LoginView. The affected app rules are `apps/user-web/AGENTS.md` and `apps/admin-web/AGENTS.md`; the relevant UI documentation is `docs/ui/INDEX.md` and `docs/ui/patterns.md`.

## Goals / Non-Goals

**Goals:**
- Use one root Toast host and one root ConfirmDialog host in each SPA.
- Keep PrimeVue overlay hosts available for public, login, authenticated shell, and feature route flows.
- Remove duplicate overlay host rendering from shells and route-level views.
- Preserve existing toast/confirmation service call sites and documented toast presentation.
- Verify both web apps because this is cross-SPA frontend infrastructure.

**Non-Goals:**
- Change toast severity, lifetime, copy, or logging behavior.
- Replace PrimeVue Toast, ConfirmDialog, `useToast()`, `useConfirm()`, or existing shared feedback helpers.
- Create a shared overlay component or move root app composition into `@gitiempo/web-shared`.
- Change route guards, auth flows, API clients, or backend behavior.

## Decisions

1. Mount PrimeVue service hosts in each root `App.vue`.

   This makes the service hosts independent of route transitions, public/authenticated route splits, and authenticated shell lifecycle. The alternative of keeping hosts in app shells would still miss login/public routes, and the alternative of page-level hosts keeps duplicate infrastructure and makes behavior page-dependent.

2. Keep the root host markup app-local instead of extracting a shared component.

   The required markup is small and directly tied to each SPA root. A shared component would add package surface area without removing meaningful product logic, and the current change does not need a new public `@gitiempo/web-shared` contract. If overlay host configuration grows beyond Toast and ConfirmDialog, extraction can be reconsidered with a stable prop-free contract.

3. Preserve the current user-web Toast presentation for both apps.

   User-web already applies `position="top-right"` and a `w-80` root pass-through class, matching `docs/ui/patterns.md`. Admin-web should adopt the same root host configuration when its host moves out of `AdminAppShell.vue`, so visible toast behavior is consistent across SPAs.

4. Remove only rendered service hosts, not feature service usage.

   Existing calls to `useToast()`, `useConfirm()`, `createAppToast()`, `createAppConfirm()`, and app-local feedback composables should continue to own feature-specific feedback decisions. The implementation only changes where PrimeVue service hosts are rendered.

## Risks / Trade-offs

- Confirmation dialogs might fail if a page test or story previously relied on a local `<ConfirmDialog>` host mounted with the component under test. → Update focused tests or test setup to include the app-level PrimeVue host where confirmation UI is asserted.
- Moving admin-web Toast from `AdminAppShell.vue` to `App.vue` may slightly change toast DOM position relative to shell markup. → Preserve the documented PrimeVue position and width, and rely on PrimeVue overlay behavior for fixed/root-level placement.
- A duplicate host could remain if a route-level import is missed. → Search both SPAs for Toast and ConfirmDialog host imports/rendering after implementation and remove all non-root hosts.
- Root-level overlay hosts are intentionally duplicated in two app roots. → Accept this small duplication to avoid a new shared package contract for two simple service-host tags.

## Migration Plan

- Update `apps/user-web/src/App.vue` to import and render one root `<ConfirmDialog>` beside the existing root `<Toast>`.
- Update `apps/admin-web/src/App.vue` to import and render root `<Toast>` and `<ConfirmDialog>` before route content.
- Remove Toast and ConfirmDialog host imports/rendering from `AdminAppShell.vue` and user-web route views that currently render page-level hosts.
- Search both SPAs for remaining `<Toast>`, `<ConfirmDialog>`, and corresponding host imports to confirm only root `App.vue` files own the hosts.
- Update `docs/ui/patterns.md` so future Toast and ConfirmDialog guidance matches root-only service-host ownership.
- Add focused root `App.vue` tests that assert each SPA renders exactly one Toast and one ConfirmDialog host, including `admin-web` rendering `/login` under those root hosts.
- Run frontend verification for both apps.

## Open Questions

- None.

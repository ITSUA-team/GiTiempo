## 1. Preparation And Design Parity

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, `docs/ui/patterns.md`, and `apps/admin-web/AGENTS.md` before implementation.
- [x] 1.2 Re-inspect `GITiempo.pen` frame `h8YRz` (`Admin Settings`) and record a parity checklist for shell state, header copy, card width, API-supported fields, separators, actions, spacing, radii, typography, and responsive adaptation.
- [x] 1.3 Inspect existing admin-web skeleton, toast, request-error, form validation, auth store, and API client patterns so the Settings page reuses current conventions.
- [x] 1.4 Confirm no implementation task requires edits outside `apps/admin-web` and admin UI docs/specs; do not modify `apps/api`, `packages/shared`, migrations, seeds, or OpenAPI artifacts.

### Design Parity Checklist

- Shell: keep the authenticated admin shell and active Settings navigation owned by `AdminAppShell`.
- Header: render `Settings` and `Configure workspace defaults, billing preferences, and organization details.` with the approved 28px/14px visual hierarchy.
- Card: render a single white settings card at `max-width: 620px`, 20px padding, `shadow-card`, and `rounded-lg` as the token-based card radius mapping.
- API-supported fields: render Workspace name, Default hourly rate, Currency, and Time zone as editable persisted fields; render invoice prefix, payment terms, legal entity, and tax ID only as inactive future fields.
- Layout: use a Workspace section, 12px field gaps, a desktop row for default hourly rate plus a 160px currency field, and stack the row on mobile.
- Controls: use 38px-high PrimeVue inputs/selects with token-backed borders/backgrounds and field labels at 13px medium.
- Actions: place `Cancel` and primary `Save Settings` in a separate right-aligned action row with a 10px gap and responsive full-width stacking on narrow screens.
- Loading: use a structured Skeleton matching the header, card fields, separator/action rhythm, not a generic spinner.
- Compromise: design-only Billing Defaults and Organization sections are visible but inactive because the current API cannot persist them.

## 2. Admin Settings Data Boundary

- [x] 2.1 Add `apps/admin-web/src/services/admin-settings-client.ts` with methods for `getWorkspace`, `updateWorkspace`, `getWorkspaceSettings`, and `updateWorkspaceSettings` using `requestJson`, existing shared schemas, auth headers, response parsing, and repository error parsing.
- [x] 2.2 Add focused client tests for request paths, methods, headers, payload shape, response parsing, schema rejection, and API error propagation.
- [x] 2.3 Add an admin-web-local settings form schema or mapper for browser input validation of workspace name, default hourly rate, and currency before current API payloads cross the client boundary.
- [x] 2.4 Add `useAdminSettingsPage` composable to load workspace/settings in parallel, expose loading/request-error/form/dirty/saving state, reset on cancel, save only changed endpoint payloads, preserve failed edits, and reconcile authoritative state after successful save.
- [x] 2.5 Add composable tests for initial load success, initial load failure with retry, dirty-state derivation, cancel/reset, workspace-only save, settings-only save, combined save, validation failure, and save failure preserving pending values.

## 3. Admin Settings UI

- [x] 3.1 Replace `apps/admin-web/src/views/SettingsView.vue` placeholder with a thin composition surface that uses the settings composable and dedicated Settings UI leaves.
- [x] 3.2 Add `SettingsForm.vue` or equivalent admin-local form component rendering a 620px desktop card that follows the approved Settings card density while exposing current API-supported fields as editable and unsupported future fields as inactive.
- [x] 3.3 Render settings inputs with PrimeVue controls: `InputText` for workspace name, `InputNumber` for default hourly rate, `Select` for currency, `Message` or helper text for validation feedback, and PrimeVue `Button` for actions.
- [x] 3.4 Add a page-level Settings skeleton using PrimeVue `<Skeleton>` that approximates the header, settings card, field rows, separators, and action row while initial data is pending.
- [x] 3.5 Add a request-error surface with retry affordance and toast feedback; do not render empty/default settings as a substitute for failed loads.
- [x] 3.6 Wire `Cancel` to restore latest persisted values without sending requests and `Save Settings` to validate, submit changed fields, show loading state, and surface success/error toasts.
- [x] 3.7 Adapt the 620px desktop form card responsively for mobile while preserving action hierarchy and token-based visual language.
- [x] 3.8 Keep all styling token-based through Tailwind utilities and PrimeVue `pt` overrides; do not use raw hex classes, deep selectors, or custom raw controls for standard app UI.
- [x] 3.9 Document the known design compromise: `h8YRz` includes invoice prefix, payment terms, legal entity, and tax ID, but this admin-web-only pass must present them only as inactive future fields because the current API does not support them.

## 4. Documentation

- [x] 4.1 Update `docs/ui/pages-admin.md` so the Settings page section documents the implemented current API-supported fields, save/cancel behavior, no-API-change scope, and skeleton first-load treatment.
- [x] 4.2 Update `docs/ui/components.md` loading guidance so structured page first-loads may use PrimeVue Skeletons matching final layout and must keep request-error states distinct from empty states.
- [x] 4.3 Ensure OpenSpec deltas remain aligned with the final admin-web-only implementation scope before marking tasks complete.

## 5. Verification

- [x] 5.1 Run focused admin-web tests for the Settings client/composable/view changes.
- [x] 5.2 Run `pnpm --filter admin-web lint` and fix new Vue/Tailwind/order warnings introduced by this change.
- [x] 5.3 Run `pnpm --filter admin-web typecheck`.
- [x] 5.4 Perform final design parity review against `GITiempo.pen` frame `h8YRz`, documenting the API-scope compromise and any PrimeVue-only compromise.
- [x] 5.5 Run `pnpm exec openspec validate add-admin-settings-page --strict` and fix validation issues.

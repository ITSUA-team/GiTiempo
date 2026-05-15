## Why

The admin Settings route is still a placeholder, while the approved `GITiempo.pen` Admin Settings screen defines a real workspace settings surface. This pass should replace the placeholder with an admin-web-only PrimeVue/Tailwind page using the existing API contract and a structured Skeleton first-load state.

## What Changes

- Replace `apps/admin-web/src/views/SettingsView.vue` with a functional Settings page inside the authenticated admin shell.
- Analyze `GITiempo.pen` frame `h8YRz` and use it as the visual parity reference for header copy, card layout, field density, spacing, radii, action layout, and responsive behavior.
- Load and save only settings already exposed by the current API: workspace name through `/workspace`, and currency/default hourly rate through `/workspace/settings`.
- Render Billing Defaults and Organization design fields as disabled inactive future controls without submitting or persisting them.
- Add admin-web-local client/composable/form pieces for loading, dirty-state tracking, cancel/reset, validation, save feedback, request-error retry, and PrimeVue Skeleton loading.
- Keep all work scoped to `apps/admin-web` and admin UI docs/tests; do not modify API, shared contracts, database schema, migrations, seeds, or OpenAPI artifacts.

## Capabilities

### New Capabilities

- `admin-settings-page`: Defines the admin-web Settings page behavior, design-parity expectations, loading/error states, and save flow using current API-supported fields only.

### Modified Capabilities

- `admin-pages`: Tightens the Settings page requirement from a generic grouped form placeholder to the implemented admin-web workspace settings surface.
- `components`: Clarifies that structured settings first-loads may use PrimeVue Skeletons that approximate the final page layout while keeping request-error states distinct.

## Impact

- Affected frontend app: `apps/admin-web` Settings route, admin-local settings client/composable, form/loading components, and tests.
- Affected docs/specs: `docs/ui/pages-admin.md`, `docs/ui/components.md`, and this OpenSpec change.
- Not affected: `apps/api`, `packages/shared`, database schema/migrations/seeds, and generated OpenAPI artifacts.

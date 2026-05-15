## Why

The admin Dashboard route still renders a placeholder even though the approved `GITiempo.pen` Admin Dashboard screen defines a concrete workspace overview with summary cards and recent activity. This change should replace the placeholder with an admin-web-only dashboard that matches the approved design while using only existing API endpoints.

## What Changes

- Replace `apps/admin-web/src/views/DashboardView.vue` with a functional dashboard inside the authenticated admin shell.
- Analyze `GITiempo.pen` frame `bCRah` and use it as the parity reference for header copy, four stat cards, recent activity card, table/list density, spacing, radii, typography, and responsive behavior.
- Reuse existing shared UI leaves where they fit, especially `StatsHeader` and `StatCard` from `@gitiempo/web-shared`.
- Build the Recent Activity surface with PrimeVue `DataTable`/`Column` patterns and token-backed Tailwind styling rather than custom table markup.
- Use only existing endpoints and frontend clients for dashboard data; do not modify `apps/api`, shared contracts, database schema, migrations, seeds, or OpenAPI artifacts.
- Add admin-web-local state mapping, request-error, empty, and skeleton states for the dashboard page.

## Capabilities

### New Capabilities

- `admin-dashboard-page`: Defines the admin-web Dashboard page behavior, design-parity requirements, current-API data mapping, loading/error states, and recent activity table behavior.

### Modified Capabilities

- `admin-pages`: Tightens the existing dashboard summary requirement from a generic summary surface to the implemented current-API admin dashboard matching the approved design.

## Impact

- Affected frontend app: `apps/admin-web` dashboard route, dashboard-local composable/client integration, table/loading components, and tests.
- Affected shared frontend usage: reuse existing `@gitiempo/web-shared` stat/header components; no new shared extraction unless an existing stable leaf is clearly reused.
- Affected docs/specs: `docs/ui/pages-admin.md` and this OpenSpec change.
- Not affected: `apps/api`, `packages/shared` contracts, database schema/migrations/seeds, generated OpenAPI artifacts, and new backend dashboard endpoints.

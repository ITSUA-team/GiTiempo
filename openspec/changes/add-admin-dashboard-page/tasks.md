## 1. Preparation And Design Parity

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, and `apps/admin-web/AGENTS.md` before implementation.
- [x] 1.2 Re-inspect `GITiempo.pen` frame `bCRah` (`Admin Dashboard`) and record a parity checklist for shell state, header copy, stat card labels/count/density, recent activity surface, table/list density, spacing, radii, typography, and responsive adaptation.
- [x] 1.3 Inspect existing dashboard placeholder, Reports/Members/Projects page patterns, skeletons, request-error states, toasts, auth store access token usage, and existing admin clients.
- [x] 1.4 Confirm no implementation task requires edits to `apps/api`, `packages/shared`, migrations, seeds, or OpenAPI artifacts; use only existing endpoints.

### Design Parity Checklist

- Shell: keep authenticated admin shell and active Dashboard navigation owned by `AdminAppShell`.
- Header: render `Dashboard` and `Workspace overview with key metrics and recent activity.` with the approved 28px/14px hierarchy.
- Stats: render four dashboard stat cards in a single desktop row, 108px design height, 16px gaps, `shadow-card`, `rounded-lg`, 16px padding, 13px label, 28px value, and 12px helper copy.
- Current API metrics: admins derive Active Members from members, Hours This Week from reports/time, Pending Invites from invites, and Active Projects from projects summary/list; PM users derive role-safe metrics only from projects and reports/time.
- API-scope compromise: do not invent invoice totals or invoice activity while no invoice endpoint exists.
- Recent Activity: render a `Recent Activity` card below stats with 20px padding, 16px internal gap, compact rows, newest-first ordering, and activity/time information.
- Feed requirement: implement Recent Activity with compact design feed rows, circular token-backed indicators, activity text, and time copy.
- Loading: use a structured PrimeVue Skeleton matching the header, four stat cards, and Recent Activity feed before rendering empty or default states.
- Mobile: stack stat cards and keep the activity feed readable while preserving information hierarchy.

## 2. Dashboard Data Boundary

- [x] 2.1 Add or extend admin-web-local dashboard data mapping that loads data through existing clients only: `adminMembersClient`, `adminProjectsClient`, and `adminReportsClient`.
- [x] 2.2 Derive stat card view models from existing responses without new API fields or fabricated values.
- [x] 2.3 Derive recent activity rows from current endpoint timestamps such as member `lastActiveAt`, invite `createdAt`, project `updatedAt`, and report row timing fields where available.
- [x] 2.4 Add a focused `useAdminDashboardPage` composable or equivalent state module that exposes initial loading, request error, retry, stats, activity rows, and empty-state flags.
- [x] 2.5 Add tests for successful load, failed initial load with retry, empty derived activity, role/token absence behavior, stat derivation, and newest-first activity sorting.

## 3. Admin Dashboard UI

- [x] 3.1 Replace `apps/admin-web/src/views/DashboardView.vue` placeholder with a thin composition surface that uses the dashboard state and focused UI leaves.
- [x] 3.2 Reuse `SectionHeader` and `StatCard` from `@gitiempo/web-shared` where compatible with `bCRah`.
- [x] 3.3 Add a dashboard skeleton using PrimeVue `<Skeleton>` that approximates the final header, stat card row, recent activity card, and feed rows.
- [x] 3.4 Add a request-error surface with retry affordance and toast feedback; do not render empty/default dashboard content after failed required requests.
- [x] 3.5 Add a Recent Activity component using compact design feed rows rather than a table.
- [x] 3.6 Use token-backed circular indicators for activity type/status styling and avoid visible label tags.
- [x] 3.7 Add a true empty state for successful loads with no derived activity rows.
- [x] 3.8 Keep all styling token-based through Tailwind utilities and PrimeVue `pt` overrides; do not use raw hex classes, deep selectors, or raw standard controls.
- [x] 3.9 Adapt dashboard layout responsively for mobile while preserving the stat hierarchy and recent activity readability.

## 4. Documentation And Specs

- [x] 4.1 Update `docs/ui/pages-admin.md` Dashboard guidance with implemented current-API metrics, Recent Activity feed behavior, no-API-change scope, skeleton first-load treatment, and invoice/API compromise.
- [x] 4.2 Ensure OpenSpec deltas remain aligned with the final implementation scope before marking tasks complete.
- [x] 4.3 Document any PrimeVue-only or API-scope compromises in the final implementation review.

## 5. Verification

- [x] 5.1 Run focused admin-web tests for dashboard data mapping, composable, and view/feed behavior.
- [x] 5.2 Run `pnpm --filter admin-web lint` and fix new Vue/Tailwind/order warnings introduced by this change.
- [x] 5.3 Run `pnpm --filter admin-web typecheck`.
- [x] 5.4 Perform final design parity review against `GITiempo.pen` frame `bCRah`, explicitly documenting the invoice/API compromise and any PrimeVue-only compromise.
- [x] 5.5 Run `pnpm exec openspec validate add-admin-dashboard-page --strict` and fix validation issues.

## 6. Review Fixes

- [x] 6.1 Update OpenSpec deltas/tasks to codify PM-safe dashboard scope, fixed Pending Invites admin card, local-week report bounds, and Recent Activity expansion.
- [x] 6.2 Update dashboard composable/view model so admin users may load members/invites while PM/non-admin users use only project summary, project list, and reports/time clients.
- [x] 6.3 Add focused tests proving PM dashboard loading does not call members/invites, admin still renders Pending Invites, activity expansion remains specified, and local-week query bounds are sent.
- [x] 6.4 Run admin-web tests/lint/typecheck and strict OpenSpec validation.

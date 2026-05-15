## Context

`apps/admin-web/src/views/DashboardView.vue` currently renders a shared placeholder page. The approved `GITiempo.pen` frame `bCRah` (`Admin Dashboard`) shows the intended screen: authenticated admin shell with Dashboard navigation active, a `Dashboard` header with supporting copy, four 108px stat cards, and a Recent Activity surface below.

This change is admin-web only. It must use PrimeVue components, PrimeVue/Tailwind token styling, existing shared UI leaves, and existing endpoints only. There is no checked-in invoice API, activity feed API, aggregate dashboard endpoint, or shared contract for dashboard data. Current implementation must compose dashboard state from existing frontend clients and endpoint responses such as members, invites, projects, and time reports.

Required implementation references are `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, `apps/admin-web/AGENTS.md`, and `GITiempo.pen` frame `bCRah`.

## Goals / Non-Goals

**Goals:**

- Replace the admin Dashboard placeholder with a functional dashboard page in the authenticated shell.
- Match `bCRah` for page header copy, stat-card count and density, card spacing/radii/shadow, Recent Activity feed hierarchy, and responsive adaptation.
- Reuse `StatsHeader` and `StatCard` from `@gitiempo/web-shared` for the page header and stat row when their structure fits the approved design.
- Render Recent Activity as the approved compact feed with token-backed circular indicators, activity copy, and time copy.
- Load dashboard data from existing endpoints only and keep request-error, empty, and loading states distinct.
- Use PrimeVue `Skeleton` for an initial page skeleton matching the header, stat cards, and recent activity feed.

**Non-Goals:**

- No changes to `apps/api`, `packages/shared`, database schema, migrations, seed data, generated OpenAPI, or backend endpoints.
- No new aggregate dashboard endpoint or audit/activity endpoint.
- No persisted invoice metrics until an invoice API exists.
- No custom raw tables, raw controls, raw loading spinners, deep selectors, or raw hex styling.
- No cross-app extraction unless an existing shared component already fits exactly.

## Decisions

1. Compose dashboard state from current endpoint families.

   The Dashboard page should use existing admin clients where possible: `adminMembersClient.listMembers`, `adminMembersClient.listInvites`, `adminProjectsClient.getManagementSummary`, `adminProjectsClient.listProjects`, and `adminReportsClient.getTimeReport`. These calls can provide Active Members, Pending Invites, Active Projects, Hours This Week, and derived recent activity without changing API contracts.

   Alternative considered: create a backend `/dashboard` aggregate endpoint. Rejected because the user explicitly required no API changes.

2. Preserve four stat-card structure while documenting API-scope compromises.

   The approved design includes `Open Invoices`, but the repo has no invoice endpoint or contract. The current pass should keep the four-card visual rhythm by using current API-backed cards such as Active Members, Hours This Week, Active Projects, and Pending Invites, or rendering Open Invoices only as an inactive future metric if strict label parity is chosen during implementation. The final implementation must not invent invoice data.

   Alternative considered: hardcode design invoice values. Rejected because it would misrepresent persisted data.

3. Build Recent Activity as the approved compact feed from derived current data.

   The design shows a feed list with colored markers and relative timestamps. The implementation renders compact feed rows with a circular activity-type indicator, activity text, and time copy. Visible type labels are intentionally omitted; each circle exposes the type through the same PrimeVue tooltip treatment used by navigation and accessible label text. Data can be derived from available timestamps: member `lastActiveAt`, invite `createdAt`, project `updatedAt`, and time report row `lastStartedAt`/`firstStartedAt` where present.

   Alternative considered: keep the PrimeVue DataTable compromise. Rejected after user feedback because the approved design is a feed, not a table.

4. Keep route view thin and page-specific state testable.

   `DashboardView.vue` should compose a dashboard composable and focused UI leaves rather than owning all request orchestration and feed markup directly. This keeps loading, retry, empty, derivation, and role-scope behavior easy to test.

   Alternative considered: implement all dashboard behavior in `DashboardView.vue`. Rejected because this route has multiple endpoint lifecycles and derived state.

5. Match design and docs with token-based PrimeVue/Tailwind styling.

   The page should use shared tokens (`bg-surface`, `bg-app-bg`, `text-text-dark`, `text-text-muted`, `border-divider`, `shadow-card`, `rounded-lg`) and PrimeVue `pt` overrides when needed. PrimeVue conflicts must preserve behavior/information hierarchy and be documented in the final review.

## Risks / Trade-offs

- Existing endpoints do not provide a true activity stream -> Derive recent rows from current endpoint timestamps and label this as recent workspace activity rather than a complete audit feed.
- Design includes invoice activity/metric but no invoice API exists -> Do not submit or display invented invoice data; document the API-scope compromise and use only current API-backed data or an inactive future metric.
- Multiple requests can fail independently -> Treat dashboard initial load as a required data load; show request-error with retry and toast feedback instead of mixing partial default values with loaded data.
- Derived activity can be sparse -> Show a distinct empty state after successful loads when no current data can produce activity rows.
- Feed activity is derived rather than a true audit stream -> Preserve the design's visual hierarchy with compact rows, token styling, and newest-first ordering while documenting the current API scope.

## Migration Plan

- No migration is required because this change does not alter backend data or contracts.
- Rollback is limited to reverting admin-web dashboard files and documentation/spec updates.

## Open Questions

- Whether to show the fourth stat card as current API-backed `Pending Invites` or as an inactive `Open Invoices` future metric should be finalized during implementation after a parity pass. In either case, no invoice data may be invented and no API may be changed.

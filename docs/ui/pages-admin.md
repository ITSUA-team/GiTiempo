<!-- Scope: admin SPA screens -->
<!-- Read when: implementing admin or PM-facing pages -->

# Admin SPA Pages

## Dashboard

- Initial page load uses a skeleton matching the dashboard header, summary cards, and recent activity feed.
- Four summary stat cards use existing API-backed workspace metrics only. Admin users see Active Members, Hours This Week, Pending Invites, and Active Projects. PM users use PM-safe project/report metrics only and must not call member or invite management clients.
- Hours This Week is derived from the reports/time endpoint using a frontend-supplied local-week window: local Monday at `00:00:00.000` through the current request time, converted to ISO timestamps. Member, invite, and project metrics are derived only from endpoints allowed for the current role.
- The approved design's Open Invoices metric is deferred until an invoice API/contract exists; do not display fabricated invoice totals or invoice activity.
- Recent Activity uses the approved feed layout with compact rows, newest-first ordering, token-backed circular activity indicators, activity copy, and relative time.
- Recent Activity rows are derived from current timestamps such as member `lastActiveAt`, invite `createdAt`, project `updatedAt`, and report row timing fields; successful loads with no derived rows render an empty state instead of default activity.
- Recent Activity previews the first five rows; when more than five rows are available, render a PrimeVue `Button` labeled `View all activity` that expands the feed locally and can collapse back to the five-row preview.
- Activity type labels are not rendered as visible tags; expose the type on the circular indicator with the same PrimeVue `v-tooltip` treatment used by navigation and with `aria-label`.
- Request failures render the standard retryable request-error surface and toast feedback; do not collapse failed required requests into empty/default dashboard content.
- Dashboard implementation is admin-web only and must not require new dashboard, invoice, activity, aggregate, backend, shared contract, database, seed, migration, or OpenAPI changes.

## Reports Page

- Initial report load uses a skeleton matching the reports header, setup controls, summary cards, and results table.
- Report setup bar: project, member, date range, group-by.
- Report setup controls define the backend CSV export scope and do not change the loaded table rows or summary cards by themselves.
- Invalid date ranges show validation feedback and cannot generate CSV or call report data endpoints.
- Summary totals row above the results table reflects the loaded backend-generated project-member report data.
- Results table is searchable, column-filterable, uses stable default ordering, and supports CSV export.
- Results table header includes global search with placeholder `Search report rows`.
- Results table column filters use the existing management-table filter-row treatment for project, member, hours, and billable columns. Hours and billable filters may be omitted only when the implementation does not yet provide a matching numeric/status control.
- CSV export downloads rows from the backend report export endpoint for the current report setup controls; table-only search and column filters do not change export scope.
- PM users cannot widen filters beyond active projects visible through their report scope, including active public projects plus active private projects assigned to that PM.

## Invoices Page

- Invoice list table with status tags.
- Invoice list table is searchable with placeholder `Search invoices` and uses column filters for invoice id/name, project, amount, and status.
- Create Invoice flow uses a modal dialog.
- Dialog fields: project, date range, hourly rate, discount, total amount.

## Members Page

- Initial page load uses a skeleton matching the stats header, stat cards, and members table before rendering empty or request-error states.
- Members table with avatar, role, projects assigned, last active, and icon-only row actions with text tooltips.
- Members table is searchable with placeholder `Search members` and uses column filters for member name/email, role, assigned projects, and last active.
- Invite member opens a dialog.
- Project assignment is handled with inline expansion and checkboxes for non-admin members.

## Projects Page

- Initial page load uses a skeleton matching the stats header, stat cards, and projects table before rendering empty or request-error states.
- Project list table includes project name, source, assigned members, total hours, visibility, and icon-only row actions with text tooltips.
- Project list table is searchable with placeholder `Search projects` and uses column filters for project name, source, assigned members, total hours, and visibility.
- Project settings row is a single line: `Select members` uses PrimeVue `<MultiSelect>`, `Visibility` uses PrimeVue `<Select>`, followed by `Cancel` and `Save` actions.
- Manual project creation uses the authenticated Add Project page at `/projects/new`.

## Settings Page

- Single-column workspace settings form inside the authenticated admin shell.
- Header copy: `Settings` with `Configure workspace defaults, billing preferences, and organization details.`
- Desktop card target is `max-width: 620px` with token-backed surface, `rounded-lg`, `shadow-card`, 20px padding, 12px field gaps, and a right-aligned bottom action row.
- Current editable settings fields are `Workspace name`, `Default hourly rate`, `Currency`, and `Time zone`.
- `Time zone` uses a full-width PrimeVue `<Select>` below the Default hourly rate + Currency row, enables filtering, and is populated from `Intl.supportedValuesOf('timeZone')` when available with a curated fallback list that includes `UTC` and IANA time-zone names such as `Europe/Kyiv`; it must also include the current persisted time zone and current draft/form time zone when either is missing from the option source.
- Render the design's Billing Defaults and Organization sections as inactive future fields for parity: `Invoice prefix`, `Payment terms`, `Legal entity`, and `Tax ID` are disabled, non-submitting controls until the API contract supports them.
- Do not send invoice prefix, payment terms, legal entity, or tax ID to any API endpoint.
- Initial load reads workspace identity from `/workspace` and workspace settings from `/workspace/settings`.
- The authenticated admin shell header reads `/workspace` by default for the visible workspace label; Settings save updates that label from the authoritative workspace response.
- Save sends workspace name changes to `/workspace` and currency/default hourly rate/time zone changes to `/workspace/settings`; unchanged resources are not patched only to satisfy schemas.
- `Cancel` restores the latest loaded or saved values without sending a request.
- Use a structured PrimeVue Skeleton first-load state that mirrors the implemented header, card, field rows, and action row.
- Keep failed initial requests distinct from empty/default settings: show a request-error surface with retry and toast feedback instead of rendering default form values.

## Cross-App Navigation

- The admin SPA should expose a visible entry point back to the user workspace when the user SPA is available.
- Place the cross-link in the shared shell profile dropdown so it stays consistent with the user SPA shell treatment.

## Error Pages

- 404 Not Found renders as a standalone route-level page outside the authenticated admin shell when the user reaches an unknown `admin-web` route.
- Standalone `admin-web` 403/404 pages do not render the sidebar, admin top-bar identity area, or in-shell workspace navigation.
- 404 content uses the shared centered empty/error state pattern: soft accent illustration, eyebrow `404`, title `Page not found`, concise helper copy, and primary action `Back to dashboard`.
- The 404 secondary action `Go back` renders only when the browser history contains a prior entry for the current tab. When no prior history entry exists, omit the secondary action entirely.
- 403 Forbidden renders as a standalone route-level page outside the authenticated admin shell when the current user is signed in but lacks permission for an admin page, report scope, project, invoice, member, or workspace setting.
- 403 content uses the same centered error panel structure with eyebrow `403`, title `You do not have access`, helper copy explaining that the current admin role cannot open the page, primary action `Back to dashboard`, and secondary action `Switch workspace` when another workspace is available.
- Keep both pages distinct from request-error states inside data cards. Route-level 403/404 pages replace the full route surface; request errors stay scoped to the feature surface that failed.

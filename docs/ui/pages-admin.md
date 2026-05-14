<!-- Scope: admin SPA screens -->
<!-- Read when: implementing admin or PM-facing pages -->

# Admin SPA Pages

## Dashboard

- Initial page load uses a skeleton matching the dashboard header, summary cards, and recent activity table.
- Four summary stat cards.
- Recent activity feed using the same DataTable patterns as user pages.

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

- Single-column grouped form layout.
- Workspace fields include name, default hourly rate, and currency.
- Save action pinned per section or at the page bottom.

## Cross-App Navigation

- The admin SPA should expose a visible entry point back to the user workspace when the user SPA is available.
- Prefer placing the cross-link in the shared shell identity/top-bar area so it stays consistent with the user SPA shell treatment.

## Error Pages

- 404 Not Found renders inside the authenticated admin shell when the user reaches an unknown `admin-web` route.
- 404 content uses the shared centered empty/error state pattern: soft accent illustration, eyebrow `404`, title `Page not found`, concise helper copy, primary action `Back to dashboard`, and secondary action `Go back`.
- 403 Forbidden renders inside the authenticated admin shell when the current user is signed in but lacks permission for an admin page, report scope, project, invoice, member, or workspace setting.
- 403 content uses the same centered error panel structure with eyebrow `403`, title `You do not have access`, helper copy explaining that the current admin role cannot open the page, primary action `Back to dashboard`, and secondary action `Switch workspace` when another workspace is available.
- Keep both pages distinct from request-error states inside data cards. Route-level 403/404 pages replace the page content area; request errors stay scoped to the feature surface that failed.
- Do not hide the shell navigation on authenticated 403/404 pages; users should retain normal admin navigation and the cross-app workspace entry point.

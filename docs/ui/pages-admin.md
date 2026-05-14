<!-- Scope: admin SPA screens -->
<!-- Read when: implementing admin or PM-facing pages -->

# Admin SPA Pages

## Dashboard

- Four summary stat cards.
- Recent activity feed using the same DataTable patterns as user pages.

## Reports Page

- Filter bar: project, member, date range, group-by.
- Filters apply in real time with 300ms debounce.
- Summary totals row above the results table.
- Results table is sortable, searchable, column-filterable, and supports CSV export.
- Results table header includes global search with placeholder `Search report rows`.
- Results table column filters use the shared PrimeVue DataTable filter-row pattern for project, member, hours, and billable columns. Hours and billable filters may be omitted only when the implementation does not yet provide a matching numeric/status control.
- PM users cannot widen filters beyond their assigned scope.

## Invoices Page

- Invoice list table with status tags.
- Invoice list table is searchable with placeholder `Search invoices` and uses column filters for invoice id/name, project, amount, and status.
- Create Invoice flow uses a modal dialog.
- Dialog fields: project, date range, hourly rate, discount, total amount.

## Members Page

- Members table with avatar, role, projects assigned, last active, and icon-only row actions with text tooltips.
- Members table is searchable with placeholder `Search members` and uses column filters for member name/email, role, assigned projects, and last active.
- Invite member opens a dialog.
- Project assignment is handled with inline expansion and checkboxes for non-admin members.

## Projects Page

- Project list table includes project name, source, assigned members, total hours, visibility, and icon-only row actions with text tooltips.
- Project list table is searchable with placeholder `Search projects` and uses column filters for project name, source, assigned members, total hours, and visibility.
- Project settings row is a single line: `Select members` uses PrimeVue `<MultiSelect>`, `Visibility` uses PrimeVue `<Select>`, followed by `Cancel` and `Save` actions.
- Manual project creation uses a dialog.

## Settings Page

- Single-column workspace settings form inside the authenticated admin shell.
- Header copy: `Settings` with `Configure workspace defaults, billing preferences, and organization details.`
- Desktop card target is `max-width: 620px` with token-backed surface, `rounded-lg`, `shadow-card`, 20px padding, 12px field gaps, and a right-aligned bottom action row.
- Current persisted API-supported fields are `Workspace name`, `Default hourly rate`, and `Currency` only.
- Render the design's Billing Defaults and Organization sections as inactive future fields for parity: `Invoice prefix`, `Payment terms`, `Legal entity`, and `Tax ID` are disabled, non-submitting controls until the API contract supports them.
- Do not send invoice prefix, payment terms, legal entity, or tax ID to any API endpoint; this page must not require API, shared contract, database, seed, migration, or OpenAPI changes.
- Initial load reads workspace identity from `/workspace` and workspace settings from `/workspace/settings`.
- Save sends workspace name changes to `/workspace` and currency/default hourly rate changes to `/workspace/settings`; unchanged resources are not patched only to satisfy schemas.
- `Cancel` restores the latest loaded or saved values without sending a request.
- Use a structured PrimeVue Skeleton first-load state that mirrors the implemented header, card, field rows, and action row.
- Keep failed initial requests distinct from empty/default settings: show a request-error surface with retry and toast feedback instead of rendering default form values.

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

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

- Initial report load uses a skeleton matching the reports header, summary cards, and results table with its header controls. There is no separate setup bar to reserve space for.
- The page has no report setup bar. The results table header carries the date range, global search, and an `Export ▾` menu action offering `Export as CSV` and `Export as PDF`, in that order; the grouping builder sits on its own full-width row directly below the header (source: the approved "Admin Reports V2" `.pen` frame and the `report-grouping` OpenSpec change).
- Date range uses the existing `<DatePicker selectionMode="range" :manualInput="false">` treatment at `h-[38px]` with the search field and export button.
- Grouping is an ordered path of one to four unique levels drawn from `Project`, `Member`, and `Task` (default: a single `Project` level). The builder renders one accent-tint pill chip per level with a grip icon, label, and remove `×` (the last remaining level cannot be removed), `pi-chevron-right` separators between chips, a `+ Add level` select offering only unused dimensions, and a `Drag to reorder` hint. Chips reorder via native HTML drag-and-drop.
- Date range and grouping both act on the loaded report, not just the export. Editing the date range refetches; changing the grouping path re-folds the rows already loaded without calling report data endpoints.
- The results table renders the grouping path as an expandable hierarchy: the identity column is labeled with the joined path (e.g. `Project / Member / Task`), rows indent 24px per level, non-leaf rows carry a chevron toggle, a direct-child count (`4 members`, `2 tasks`), and subtotals summed from their leaves, and top-level group rows get a soft `bg-app-bg/50` band. Numeric columns are Entries, Hours, Billable, Billable %, and Last activity, followed by a `Total` footer row over every loaded leaf.
- The project and member column filters stay for every grouping path (both sit in the identity filter cell). Filtering leaves rebuilds the visible tree, so parent subtotals always equal the sum of the visible leaves.
- Every grouping path covers the same visible projects and presents from one fetch of project-member-task leaf rows (`groupBy: ['project', 'user', 'task']`) requested per visible project, so changing the path never refetches and never moves summary totals. The backend only filters inactive projects for PMs, so this scope is enforced frontend-side.
- Invalid date ranges show validation feedback and cannot generate CSV or call report data endpoints.
- Summary totals row above the results table reflects the loaded backend-generated report data.
- Results table is searchable, column-filterable, uses stable default ordering, and supports CSV export.
- Results table header includes global search with placeholder `Search report rows`.
- Results table column filters use the existing management-table filter-row treatment, and every column carries one: project and member autocomplete selects, plus preset selects for entries (Any / 1+ / 10+ / 50+), hours (Any / Tracked / 8h+ / 40h+), billable (Any / Billable / Non-billable), billable share (Any / Below 50% / 50%+ / 90%+), and last activity (Any time / Today / Last 7 days / Last 30 days). The aggregate filters compare the displayed totals of top-level groups (never the invisible leaves underneath), keep qualifying groups' whole subtrees, and the total row follows the visible groups; a group with no billable share or no activity only passes the Any option.
- CSV export downloads backend-generated detailed project-task-user rows for the current date range, and also carries the table's project filter — plus its member filter when a member level is grouped — so the file holds the same rows and sums as the table.
- PDF export downloads a backend-generated styled document (`format=pdf` on the same endpoint) following the approved "Report PDF Preview" design: brand masthead, period and workspace, filters and grouping line, summary strip, the grouped table at the requested grouping path with per-level subtotals, a total row, and footers with the generation date and page numbers. It renders in the standard Helvetica family (the design's Inter webfont is not embedded).
- Search and the aggregate column filters (entries, hours, billable, billable share, last activity) cannot scope the export, nor can a member filter while no member grouping level is configured. Aggregate filters compare displayed group totals, and the global search matches formatted labels including durations and percentages; the CSV is detailed project-task-user rows holding none of those. The export endpoint's own `search` is not an equivalent either: it matches task titles the table never shows and ignores the duration labels the table does. A member filter over rows without member identity keeps everyone's time on screen while the file would hold only that member's entries. While any of these is active, the `Export` menu is disabled with a tooltip saying why; adding a member grouping level to a member-filtered table makes the export valid again.
- Grouping re-folds the table but only labels the CSV. The export endpoint always emits detailed project-task-user rows and carries the ordered `groupBy` path as metadata (joined as `project>user>task` in the group-by column). This is deliberate - see the archived `2026-07-09-clarify-detailed-report-csv-export` change - so do not "fix" the export to collapse rows to match the table grouping.
- PM users cannot widen filters beyond active projects visible through their report scope, including active public projects plus active private projects assigned to that PM.

## Invoices Page

- Invoice page UI is deferred until an invoice API/contract exists.
- Do not expose invoices in authenticated shell navigation, dashboard metrics/activity, or page/table content while the invoice UI is deferred.
- The protected `/invoices` route may remain as a hidden route-inventory placeholder, but it must not render a temporary invoice table, search control, create action, modal dialog, or fabricated invoice data.
- When invoice contracts ship, restore the approved invoices page requirements from the design: searchable invoice table, status tags, table-header `Create invoice` action, invoice edit/details dialog, and status-specific invoice actions inside the dialog.

## Members Page

- Initial page load uses a skeleton matching the stats header, stat cards, and members table before rendering empty or request-error states.
- Members table shows avatar, role, projects assigned, and last active. The member name is the edit entry point and opens the inline member settings section.
- Members table is searchable with placeholder `Search members` and uses column filters for member name/email, role, assigned projects, and last active.
- An icon-only primary action sits in the members table header next to the search control and opens the invite flow. Use tooltip/accessibility copy `Invite member`.
- The inline member settings section owns assignment changes and the destructive `Remove member` action; do not keep separate edit/delete icons in the main members rows.
- Pending invitations render in a separate card below the members table using the same management-table/card visual language. Desktop/tablet columns are Email, Role, Expires, and Actions; mobile renders stacked cards with the same fields.
- Pending invitation row actions are icon-only controls with text tooltips and accessible labels: `Resend invite` and `Cancel invite`. `Resend invite` calls the admin-only resend endpoint, shows success/error toast feedback, and refreshes pending invite data. `Cancel invite` uses the shared destructive confirmation dialog before issuing the existing cancel request.
- Empty pending invitations state is distinct from request-error state; failed resend or cancel keeps the row visible and surfaces the backend message.
- Project assignment is handled with inline expansion and PrimeVue `<AutoComplete multiple dropdown forceSelection>` for non-admin members, with selected projects shown as removable chips and typeahead search over active projects.

## Projects Page

- Initial page load uses a skeleton matching the stats header, stat cards, and projects table before rendering empty or request-error states.
- Project list table includes project name, source, assigned members, total hours, and visibility. It does not keep a separate row-actions column.
- Project list table is searchable with placeholder `Search projects` and uses column filters for project name, source, assigned members, total hours, and visibility.
- An icon-only primary action sits in the projects table header next to the search control. Use tooltip/accessibility copy `New project`.
- The project name is the edit entry point and opens the inline project settings section instead of using a row-level edit icon.
- The status-specific secondary action lives inside the inline project settings section instead of the table row: active projects show `Archive project`, and archived projects show `Unarchive project`.
- Project settings row is a single line: `Select members` uses PrimeVue `<AutoComplete multiple dropdown forceSelection>` with selected members shown as removable chips and typeahead search over non-admin members, `Visibility` uses PrimeVue `<Select>` for the fixed Public/Private choice, `New task billable default` uses a binary billable control, followed by `Cancel` and `Save` actions.
- Manual project creation uses the authenticated Add Project page at `/projects/new` and includes `Default billable for new tasks`.
- When a project default billable value changes after tasks or time entries already exist in that project, save the new default immediately for future tasks, then show a follow-up popup that asks only whether existing tasks and existing time entries in that project should also be updated.

## Settings Page

- Single-column workspace settings form inside the authenticated admin shell.
- Settings uses the shared top-bar breadcrumb pattern instead of a large in-content title/subtitle block.
- Desktop card target is `max-width: 620px` with token-backed surface, `rounded-lg`, `shadow-card`, 20px padding, 12px field gaps, and a right-aligned bottom action row.
- Current editable settings fields are `Workspace name`, `Default hourly rate`, `Currency`, and `Time zone`.
- `Currency` uses PrimeVue `<Select>` and `Time zone` uses PrimeVue `<AutoComplete dropdown forceSelection>`. `Time zone` stays full width below the Default hourly rate + Currency row, enables predictive filtering, and is populated from `Intl.supportedValuesOf('timeZone')` when available with a curated fallback list that includes `UTC` and IANA time-zone names such as `Europe/Kyiv`; it must also include the current persisted time zone and current draft/form time zone when either is missing from the option source. Time-zone option values remain exact IANA identifiers, while visible labels replace underscores with spaces, for example `Africa/Addis_Ababa` displays as `Africa/Addis Ababa`.
- Render the design's Billing Defaults and Organization sections as inactive future fields for parity: `Invoice prefix`, `Payment terms`, `Legal entity`, and `Tax ID` are disabled, non-submitting controls until the API contract supports them.
- Do not send invoice prefix, payment terms, legal entity, or tax ID to any API endpoint.
- Below the workspace settings form, render a desktop card at the same `max-width: 620px` for `GitHub Account` before workspace GitHub organization setup.
- The GitHub Account card shows the current user's `GET /github/connection` status without token material: loading, retryable request-error, disconnected prerequisite guidance, or connected safe account details such as login/avatar.
- The GitHub Account card links to the user profile GitHub connection flow when the user app profile URL can be built; otherwise it still renders the status and prerequisite copy without a link.
- Below the GitHub Account card, render another desktop card at the same `max-width: 620px` for `GitHub Workspace Access`.
- The GitHub card title is `GitHub Workspace Access` with helper copy explaining that admins choose which GitHub organizations the workspace can use, while members still only see data their connected GitHub account can access.
- The card includes an `Allowed organizations` section with one row per saved GitHub organization login. Each row shows the organization login, helper copy `Allowed for this workspace`, and a `Remove` action.
- The card also includes an `Add organization` section with a PrimeVue `<AutoComplete dropdown>` organization input populated from organizations visible to the current user's connected GitHub account, excluding organizations already allowed for the workspace. The input must also accept a manually typed GitHub organization login because backend validation is authoritative and can accept active memberships that are missing from suggestions. Render a primary `Add organization` action only when the current user has a connected GitHub account, the GitHub connection status request has loaded successfully, and the workspace organization policy state allows setup.
- When the current user's GitHub connection is disconnected, still loading, or failed to load, hide the `Add organization` setup action and show explanatory guidance instead of sending organization add requests from that state.
- Saved allowed-organization rows, empty state, policy loading, policy request-error state, `Remove` actions, and recovery guidance remain scoped to the workspace policy response and continue to render independently from the add-action gate when policy data can be loaded.
- Organization validation is performed through the requesting admin's connected GitHub account before the organization is saved to the workspace policy.
- This policy filters which GitHub organizations can appear in GiTiempo workspace flows; it does not broaden any member's underlying GitHub permissions.
- When adding an organization fails because GitHub reports that the organization is not visible, blocked, suspended, or otherwise unavailable to the connected account, keep the GitHub card in place and show a `GitHub App access` recovery card group above `Add organization`.
- The recovery card group is driven by the backend error response. The response supplies the organization login, a stable recovery reason, and ordered card steps with stable step ids and status values. Admin-web maps those ids/statuses to instructions and destinations without rendering visible status tags.
- Recovery cards are compact vertical cards. Each card shows the step title, concise instruction copy, and a button-style external or internal link when there is a concrete next destination.
- The expected card steps are `Install GitHub App for organization`, `Approve or unblock organization access`, `Reconnect your GitHub account`, and `Retry workspace allow-list check`. The backend response decides each card's current status, such as installed, needs install, unknown, approved, blocked, needs review, connected, reconnect needed, not connected, ready, checking, added, or still blocked.
- The install action opens the configured GitHub App install URL, defaulting to `https://github.com/apps/gi-tiempo/installations/new`, so the admin lands on GitHub's installation request page. Instruction copy tells the admin to choose the organization and install the GiTiempo GitHub App for the required repositories.
- The approve/unblock action opens `https://github.com/organizations/<org-login>/settings/installations`. Instruction copy tells the admin to review installed GitHub Apps, approve pending access, unsuspend/unblock the GiTiempo app if GitHub shows it blocked, and save repository access changes.
- The reconnect action opens the user profile GitHub connection screen in the user app. Instruction copy tells the admin to reconnect after GitHub-side app approval so GiTiempo receives a fresh user-to-server authorization.
- The retry action retries the organization validation/add flow from the same card. Instruction copy tells the admin to return to Settings, keep the same organization login, and retry after completing the GitHub-side steps.
- The recovery card group appears only when it helps recovery: disconnected GitHub connection, GitHub App blocked by the organization, pending/unknown installation, or repeated validation failure for the typed organization. Successful add returns the card to the normal allowed-organization state and confirms with toast feedback.
- External GitHub actions open in a new tab and use clear accessible labels such as `Open GitHub App install page for My-test-org-for-clock`; internal reconnect links keep the current app's standard navigation treatment.
- Implementation plan: first expose the structured backend recovery payload through the shared contract and admin Settings card state; then render recovery cards from response-provided step ids and statuses without visible status tags; then add focused admin-web tests for blocked, not-installed/unknown, disconnected, retry-success, and still-blocked states using response-provided statuses; finally browser-check the Settings card with a real blocked organization.
- Initial load reads workspace identity from `/workspace` and workspace settings from `/workspace/settings`.
- The authenticated admin shell header reads `/workspace` by default for the visible workspace label; Settings save updates that label from the authoritative workspace response.
- Save sends workspace name changes to `/workspace` and currency/default hourly rate/time zone changes to `/workspace/settings`; unchanged resources are not patched only to satisfy schemas.
- `Cancel` restores the latest loaded or saved values without sending a request.
- Use a structured PrimeVue Skeleton first-load state that mirrors the implemented header, card, field rows, and action row.
- Keep failed initial requests distinct from empty/default settings: show a request-error surface with retry and toast feedback instead of rendering default form values.

## Cross-App Navigation

- The admin SPA should expose authenticated workspace switching when the current user belongs to more than one workspace.
- Place workspace switching in the shared shell profile dropdown and treat it as a session-context change, not as cross-app navigation.
- When the user has only one workspace membership, omit the workspace-switcher section entirely.
- Keep the separate entry point back to the user workspace in the same dropdown below the workspace-switcher section when the user SPA is available.
- If the target workspace role cannot access `admin-web`, a successful workspace switch redirects to the accessible dashboard in `user-web` for that selected workspace.

## Error Pages

- 404 Not Found renders as a standalone route-level page outside the authenticated admin shell when the user reaches an unknown `admin-web` route.
- Standalone `admin-web` 403/404 pages do not render the sidebar, admin top-bar identity area, or in-shell workspace navigation.
- 404 content uses the shared centered empty/error state pattern: soft accent illustration, eyebrow `404`, title `Page not found`, concise helper copy, and primary action `Back to dashboard`.
- The 404 secondary action `Go back` renders only when the browser history contains a prior entry for the current tab. When no prior history entry exists, omit the secondary action entirely.
- 403 Forbidden renders as a standalone route-level page outside the authenticated admin shell when the current user is signed in but lacks permission for an admin page, report scope, project, invoice, member, or workspace setting.
- 403 content uses the same centered error panel structure with eyebrow `403`, title `You do not have access`, helper copy explaining that the current admin role cannot open the page, primary action `Back to dashboard`, and secondary action `Switch workspace` when another workspace membership is available.
- The 403 `Switch workspace` action opens the authenticated workspace switcher for the current session. It must not be reused as the cross-app link back to `user-web`.
- Keep both pages distinct from request-error states inside data cards. Route-level 403/404 pages replace the full route surface; request errors stay scoped to the feature surface that failed.

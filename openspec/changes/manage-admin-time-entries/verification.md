# Verification for #471

Manual acceptance ran on 2026-11-23 in Chrome against the local admin app, API and a dedicated PostgreSQL fixture database. Authentication used the API's test Firebase adapter and normal browser session restore. The tested working tree was based on `9ee72fc6`. The SHA-256 fingerprint of the modified admin-web production files was `527ec03d83cfa37360747bc6a75cbb3995fc1bf5889563aec810a90c51608aa3`. The reference design was `GITiempo.pen` at `cf51261b`, desktop `te471_1069` and mobile `te471_1569`.

| Manual scenario | Observed result |
| --- | --- |
| Admin, 1280 × 800 and 375 × 812 | Archived and unassigned public projects were available. Created and edited a manual entry for Bob, verified the owner, duration and default billability, and confirmed deletion. The edit form kept the project and member read-only. Corrected an archived entry and canceled its subsequent deletion. |
| Assigned PM, 375 × 812 and 1280 × 800 | The mobile selector offered the two assigned projects and omitted the unassigned public project. Created, edited and deleted an entry for Bob on mobile. After assignment removal, the next task lookup dismissed the editor, removed the former project's data and selected the remaining project. On desktop, disabling invoice permission hid Invoices while Time Entries and the assigned project's records remained available. |
| Running and invoiced records | Both layouts displayed the status and lock reason without edit or delete controls. The running duration advanced. |
| Invoice attached with editor open | Save returned the invoice conflict, kept the typed description in the disabled editor and refreshed the row to Invoiced. The stored description stayed unchanged. |

The desktop page matched the 60 px navigation rail, project panel width (208 px), panel gap (20 px), column order, 42 px table header, 66 px rows and pagination placement. The mobile page matched the 16 px gutters, project selector, adjacent search and create controls, adjacent member and date filters, status badges and card actions. The 375 px viewport had no horizontal overflow. The shared mobile workspace header uses its standard branding and height. Visible navigation items depend on the current role, and Settings is available from the profile menu for Admins. Date, pagination and confirmation controls use the shared PrimeVue treatments.

## Automated verification

- Root lint, typecheck and build passed.
- Root tests passed with one Vitest worker. Earlier concurrent runs hit timeouts in existing tests. The final shell adjustment passed 49 focused tests across the shell, router, page and API client.
- `pnpm api:e2e:docker` passed all 505 tests against its isolated PostgreSQL 16 container. A separate run against a local PostgreSQL 17 fixture also passed all 505 tests.
- `pnpm openapi:export` generated all seven management operations. Their request and response schemas and documented status codes match the change design.
- `pnpm exec openspec validate manage-admin-time-entries --strict` passed.

## Time Entries visual follow-up

Chrome verified the desktop Invoices table treatment at 1280 × 800, including the border, corner radius, 42 px header and 66 px entry rows. The project heading and names measured 16 px. Edit, delete and lock icons measured 20 × 20 px. At 768 px, horizontal scrolling stayed inside the table. At 375 × 812, the cards fit the viewport without horizontal overflow.

The plus button displayed only the icon and kept the accessible name **New time entry**. Enter opened the form on desktop, and tapping opened it on mobile. Edit opened the selected entry, and cancel dismissed the delete confirmation.

## In-place edits

Chrome verified a description edit against the local API at 1280 × 800 and 375 × 812. The saved description appeared in the same table row or mobile card. The existing rows and cards stayed mounted, and saving made no request for the project entry list. The desktop project sidebar measured 312 px after the width change.

## Review follow-up

- Chrome at 1280 × 800 verified the 312 px project sidebar, 16 px project names, 20 px edit icon, and accessible 38 × 38 px icon-only create button. Canceling a date selection sent no list request. Confirming a complete range sent one request with both bounds, and clearing the filter restored excluded records.
- Saving a description preserved the original DOM nodes for the edited and neighboring rows, produced no mutations in the neighboring row, and made no entry list request.
- When another operation deleted the record before Save, the editor showed the 404 message and kept the draft and selected project. Closing a destination task before Save returned 422. The editor kept the draft and original task option while removing the unavailable destination.
- At 375 × 812, the assigned PM saw cards and only the assigned projects. The icon-only create button opened the editor and the page fit the viewport. Confirm applied the date range with one request. Canceling a subsequent selection kept the applied range and sent no request.
- The desktop and mobile Pen frames use the icon-only create control and 20 px action icons. The desktop project's names use 16 px text. The plain JSON document parsed successfully after the updates.
- The exported managed PATCH schema requires at least one property and documents the 400 response for invalid input.
- All 509 API e2e tests passed on isolated PostgreSQL 17. The regression tests force both lock orders for invoice attachment versus management PATCH and DELETE, exercise reciprocal task moves, and verify another participation record is used when the first is deleted while a move waits.
- All 20 focused Admin UI and client tests passed, including invalidation of Reports and Dashboard in the workspace where the change was saved.

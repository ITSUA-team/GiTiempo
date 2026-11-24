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

## DOM review follow-up

- PASS — On the local admin page in Chrome with the DOM review changes applied to `f47fd699`, the keyboard opened the editor, saved a description against the isolated API, and returned focus to the original Edit button. At 1280 × 800 the project sidebar measured 312 px, the create button 38 px, the table header 42 px, and the entry rows 66 px. The table column order matched the desktop Pen frame.
- PASS — With the editor open, a test entry was removed from the isolated database and the next projects request was interrupted in Chrome. Save returned 404, the draft remained visible, and Save stayed disabled. Restoring the projects request and choosing Try again retained the draft and re-enabled Save.
- PASS — At 375 × 812, the assigned PM used the keyboard to choose an eligible member and task, dismissed the editor with Escape, and saw the empty result after a task-title search. The mobile layout used cards and fit the viewport.
- The focused tests also hold DELETE open on desktop and mobile to check that competing actions are disabled, and resubmit after 422 to check that the missing task error is linked to the input.

## Member picker and manual acceptance, 2026-11-24

The configured local database contains three eligible admin accounts for `My-test-org-for-clock/test-repo` with identical display names and emails and distinct GiTiempo IDs and Firebase UIDs. The database lacks the `users_email_lookup_unique` index defined by migration `0010_register_lookup_uniqueness`. Account ownership and migration history need separate reconciliation before the index can be applied to those data.

Browser acceptance ran against the branch at `b0ee77b4` with the picker changes applied, in Chrome at 1280 × 800 and 375 × 812. Writes used a disposable database. The configured local data were queried read-only.

| Scenario | Observed result |
| --- | --- |
| Duplicate member labels | In the member filter and create picker, three fixture users with the same name and email showed different ID prefixes. Network requests used the selected IDs. At 375 px the picker stayed within the viewport and all three prefixes were visible. A create from that picker persisted exactly one entry owned by the selected user, with the task's default billability. |
| Admin project selection, search and pagination | Admin could open the unassigned public project. A 22-record project displayed 20 records on page one and two on the last page. The selected member returned seven records. Switching projects cleared the filter and reset pagination. Search showed the empty-result state and clearing it restored entries. |
| Admin create, edit and delete | Empty required fields and an end earlier than the start showed field errors. Admin created a completed entry for another member. Edit kept project and member read-only. A description edit preserved the edited and neighboring row nodes and made no list request. Canceling deletion retained the record. Confirming deletion removed it after reload. |
| Historical records and locks | The archived project hid creation. Its former contributor remained selectable in the filter, and Admin corrected a record on the original closed task. Running and draft-invoiced records showed their lock reasons and omitted mutation actions. |
| Assigned PM at desktop and mobile widths | The project list omitted the unassigned public project. Mobile cards fit the viewport. PM created, edited and deleted a completed entry for another member. Member filtering, empty search, and date Confirm and Cancel passed. Confirm sent one request with both bounds. Without invoice viewing permission, PM retained Time Entries access. Revoking an assignment while the editor was open discarded the unsubmitted change, cleared project data and selected the remaining project. |
| Load and mutation failures | After an interrupted project request, Try again restored project selection and the table. Attaching a draft invoice while the editor was open caused 409. The editor retained the draft and disabled Save, the row became Invoiced, and the stored description stayed unchanged. |
| Guest and ordinary member | Guest redirected to login. The ordinary member reached standalone `/403` without admin navigation. Its primary action correctly went to the user workspace, but the visible label **Back to dashboard** differs from the `admin-pages` change spec. |

The desktop table and mobile cards followed frames `te471_1069` and `te471_1569`. The picker uses the existing PrimeVue treatment with a viewport width limit and readable ID prefixes for collisions.

## PR #588 review follow-up

- PASS — On `4a70ec1d` with the review fixes applied, Chrome opened the real create dialog against a local API and disposable database at 320, 375 and 1280 px. Both Member and Task stayed within the viewport, and both long options were selectable. The mobile lists measured 288 and 343 px respectively and truncated the long labels. The page had no horizontal overflow.
- PASS — The Admin view tests verify the width limit on both rendered overlays and the message, refreshed invoice lock and retained record after `DELETE 409` in both layouts.
- PASS — All 509 API e2e tests passed on isolated PostgreSQL 17. The race tests now wait for the database sessions blocked by the fixture transaction.

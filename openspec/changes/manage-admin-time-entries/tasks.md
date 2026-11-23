# Tasks

## 1. Shared contracts

- [x] 1.1 Define and export the management project, member and task option schemas, paginated results and list query. Cover both member lookup purposes, UUIDs, page bounds and invalid date ranges in contract tests.
- [x] 1.2 Define the strict create, patch and record-conflict contracts using existing time-entry fields and validation. Test required owner on create, immutable fields on patch, empty and invalid intervals, nullable description and both 409 codes.

## 2. API and endpoint documentation

- [x] 2.1 Add the management controller and enforce the current workspace role and explicit PM assignment. Test direct calls as Admin, assigned PM without invoice permission, unassigned PM on a public project, ordinary member, anonymous caller and caller from another workspace.
- [x] 2.2 Implement project, member and owner-specific task lookups. In integration tests include archived projects, former contributors, private projects, public projects without member assignments and exact-task access in private external projects. Check option totals across pages.
- [x] 2.3 Implement the paginated list using one scope and filter predicate for both rows and count. Test combined member, title and date filters, inclusive/exclusive boundaries, stable ordering, running and invoiced records and an empty page.
- [x] 2.4 Create completed entries on behalf of eligible owners. Test owner identity, source, duration, task billable default and override, changed eligibility after opening the form and mismatched project/task IDs.
- [x] 2.5 Implement transactional patch and delete. Test in-place historical corrections, fixed owner and project, destination eligibility, merged interval validation and successful deletion. For each rejected running or invoice-linked mutation, verify the response reason and the unchanged database row, including draft, sent and paid invoices.
- [x] 2.6 Exercise concurrent invoice attachment and administrative edit/delete against isolated PostgreSQL. Assert the committed order yields consistent invoice and time-entry data. Cover revoked PM assignment and regressions for the personal timer, personal CRUD and project team reads.
- [x] 2.7 Update `docs/API-ENDPOINTS.md` and the role matrix in `docs/PROPOSAL.md` with management scope, filters, errors and the distinction from personal operations. Run `pnpm openapi:export` and compare the exported methods, response codes and schemas with the design table.

## 3. Admin web and UI documentation

- [x] 3.1 Register the lazy route, page label and accessible navigation action. Verify router and shell tests for Admin, PM with and without invoice permission, member denial and guest redirect.
- [x] 3.2 Connect the typed management client, project selector and filtered list. Test paging through choices, empty/loading/error states, resetting pagination and stale responses after switching project or workspace. Verify former contributors appear in filters.
- [x] 3.3 Build the desktop table and mobile cards against the two referenced frames. Verify column/card content, search, filters, page controls, keyboard labels and accessible lock explanations for both record states.
- [x] 3.4 Implement create/edit dialogs and delete confirmation. Cover dependent owner/task choices, billable default, fixed owner and project on edit, historical corrections, cancel/save, stale 409 refresh and access loss with protected data cleared.
- [x] 3.5 Update `docs/ui/pages-admin.md` and the documented admin route inventory to match the page. Check role scope, navigation, field order, dialog behavior and desktop/mobile states against the feature specs and frames.

## 4. Integration and acceptance

- [x] 4.1 Run root lint, typecheck, tests and build plus `pnpm api:e2e:docker` for the isolated API suite. Record results together with strict validation of this change. See [verification](verification.md).
- [x] 4.2 Exercise the actual admin page at desktop and mobile widths as Admin and assigned PM. Cover creation for another user, edits, deletion, both lock reasons, changed permissions and inaccessible public projects. Compare both layouts against the Pen frames and record the revision, outcomes and any remaining visual differences. See [verification](verification.md).

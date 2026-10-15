# Tasks

## 1. API Client and Query Keys

- [ ] 1.1 Create `apps/admin-web/src/services/admin-invoices-client.ts` with typed methods for all 7 invoice endpoints (list, create, stats, eligible-entries, get, update, delete) using `createAuthenticatedApiClient` and `@gitiempo/shared` Zod schemas. Verify: `admin-invoices-client.spec.ts` covers request path, auth headers, payload shape, response parsing, and API error propagation for each method.
- [ ] 1.2 Add `adminInvoicesKeys` factory and `afterInvoiceMutation` invalidation helper to `apps/admin-web/src/lib/query-keys.ts`. Verify: keys follow the `['admin-web', scope, 'invoices', ...]` pattern; invalidation helper clears list, stats, and detail queries.

## 2. Composables

- [ ] 2.1 Create `composables/invoices/useInvoicesData.ts` (TanStack query for list + stats, debounced search/filter params). Verify: `useInvoicesData.spec.ts` covers loading, success, error, and filter-change behavior.
- [ ] 2.2 Create `composables/invoices/useInvoiceDetail.ts` (TanStack query for single invoice by ID). Verify: `useInvoiceDetail.spec.ts` covers load, error, and refetch.
- [ ] 2.3 Create `composables/invoices/useInvoiceCreate.ts` (mutation with cache invalidation + toast feedback). Verify: `useInvoiceCreate.spec.ts` covers success (toast + list invalidation + dialog close) and 422 domain errors (rate/currency/overflow).
- [ ] 2.4 Create `composables/invoices/useInvoiceUpdate.ts` (mutation for title/notes/status with 409 conflict handling — reload detail on conflict). Verify: `useInvoiceUpdate.spec.ts` covers success, `invoice_update_conflict`, and `invoice_invalid_status_transition`.
- [ ] 2.5 Create `composables/invoices/useInvoiceDelete.ts` (mutation with confirmation flow, 409 handling, navigate back on success). Verify: `useInvoiceDelete.spec.ts` covers admin success (toast + navigate back), PM absence, and `invoice_not_deletable` conflict.
- [ ] 2.6 Create `composables/invoices/useEligibleEntriesPreview.ts` (debounced query for eligible entries + workspace defaults). Verify: `useEligibleEntriesPreview.spec.ts` covers preview with entries, empty preview, and missing date bounds.

## 3. Invoice List Page

- [ ] 3.1 Add `invoices` variant to `components/loading/ManagementPageSkeleton.vue` matching the stats header + table structure. Verify: skeleton variant renders stat card placeholders and table row placeholders.
- [ ] 3.2 Create `components/invoices/InvoiceStatusBadge.vue` mapping draft→warn, sent→default, paid→success using PrimeVue Tag. Verify: component renders correct severity for each status.
- [ ] 3.3 Create `lib/format-currency.ts` utility wrapping `Intl.NumberFormat` with API currency field. Verify: `format-currency.spec.ts` covers USD, EUR, and edge cases.
- [ ] 3.4 Create `components/invoices/InvoicesTable.vue` as a presentational table (columns: Title link, Project, Period, Hours, Amount, Status badge) with header search control, filter row (Project dropdown, Date range picker, Status dropdown), pagination, and `Create invoice` header action emit. Verify: `InvoicesTable.spec.ts` covers column rendering, search emit, filter emits, pagination emit, and create action emit.
- [ ] 3.5 Replace `views/InvoicesView.vue` placeholder with full list page: stats cards from `useInvoicesData`, `InvoicesTable` in `SurfaceCard`, loading skeleton, empty state, retryable error, and mobile responsive branch using `MobileRecordCard` + `MobileRecordMetadataList`. Verify: `InvoicesView.spec.ts` covers skeleton-then-content, error+retry, empty state, PM-scoped data, mobile/desktop branch rendering, and row-click navigation to detail.

## 4. Invoice Create Dialog

- [ ] 4.1 Create `components/invoices/InvoiceCreateDialog.vue` with fields (Title, Project, Date range, Hourly rate, Currency, Discount, Notes), live eligible-entries preview section, empty-preview warning banner, and Cancel/Create actions. PM project-required enforcement, admin workspace-wide option. Verify: `InvoiceCreateDialog.spec.ts` covers field rendering, preview loading, empty preview warning, PM project requirement, admin empty-project option, successful creation emit, and 422 domain error display.
- [ ] 4.2 Wire `InvoiceCreateDialog` into `InvoicesView.vue` with `v-model:visible` and create mutation from `useInvoiceCreate`. Verify: integration test in `InvoicesView.spec.ts` covers dialog open from header action, create success (dialog closes + list refreshes + toast), and create failure (dialog stays open + error toast).

## 5. Invoice Detail Page

- [ ] 5.1 Create `views/InvoiceDetailView.vue` with topbar breadcrumb, page header (back button, title, status badge, status-dependent actions), read-only summary card, editable title/notes card with Save, and linked time-entries card. Verify: `InvoiceDetailView.spec.ts` covers draft/sent/paid action visibility, admin vs PM action visibility, summary card rendering, editable save success/failure, and 404 not-found state.
- [ ] 5.2 Wire status actions (`Mark as sent`, `Mark as paid`) to `useInvoiceUpdate` with toast feedback and detail reload. Verify: `InvoiceDetailView.spec.ts` covers successful status transition, `invoice_update_conflict` (reload + toast), and `invoice_invalid_status_transition` (toast + current status shown).
- [ ] 5.3 Wire `Delete` action with confirmation dialog (doc copy: "Delete this invoice? Linked time entries will be unlinked and become available for future invoices.") to `useInvoiceDelete`. Verify: `InvoiceDetailView.spec.ts` covers admin delete confirmation → success (navigate back + toast), admin delete → `invoice_not_deletable` conflict (reload + toast), and PM delete action absence.

## 6. Router and Navigation

- [ ] 6.1 Add `invoices/:id` route to `apps/admin-web/src/router/index.ts` with lazy `InvoiceDetailView`, `allowedRoles: managementRoles`, and `pageName: 'Invoices'`. Verify: router test or manual check confirms route resolves, role guard allows Admin+PM, and lazy loading works.
- [ ] 6.2 Flip `SHOW_INVOICES_NAV` to `true` in `apps/admin-web/src/constants/admin-shell.ts`. Verify: nav item renders for Admin and PM in shell; hidden for members.
- [ ] 6.3 Update `ADMIN_PAGE_NAMES_BY_ROUTE_NAME` in `admin-shell.ts` for the invoice detail route if needed for breadcrumb display. Verify: topbar shows correct page name.

## 7. Verification

- [ ] 7.1 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck` — no new errors. Fix any auto-fixable lint warnings in new Vue files.
- [ ] 7.2 Run `pnpm --filter admin-web test` — all invoice-related tests pass (client, composables, views, components).
- [ ] 7.3 Run `openspec validate --strict` for the `add-admin-invoices-ui` change — passes with no warnings.
- [ ] 7.4 Perform design parity review against the approved `Admin Invoices` `.pen` frame and `docs/ui/pages-admin.md`. Verify every delta documented in `design.md` "Design Parity Deltas" section is resolved in favor of docs. Identify and document any remaining deltas or PrimeVue-driven compromises with three parts: expected design, PrimeVue constraint, and implemented compromise.
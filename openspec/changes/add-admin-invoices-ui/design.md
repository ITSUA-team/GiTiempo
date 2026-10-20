# Design

## Context

The invoice backend API (7 endpoints), shared Zod contracts, and time-entry eligibility logic are complete (archived change `2026-10-15-add-invoices-backend`). The `admin-web` invoices route is wired (`admin-invoices`, Admin+PM roles, lazy), but `InvoicesView.vue` is a hidden placeholder. The invoices nav item is gated by `SHOW_INVOICES_NAV = false` in `apps/admin-web/src/constants/admin-shell.ts`. No invoices client, composable, or query-key entries exist. All shared contracts are in `packages/shared/src/contracts/invoices.ts`.

The admin-web app has two established data-fetching patterns: ref-based local-state composables (`useAdminProjectsData`) and TanStack-query composables (`useReportsData`). The invoice UI should follow the TanStack-query pattern since it aligns with the newer server-state approach and supports cache invalidation after mutations.

See `proposal.md` for motivation. See `specs/admin-invoices-page/spec.md` for behavior requirements and `specs/admin-routing/spec.md` for the route delta.

## Goals / Non-Goals

**Goals:**

- Ship a full invoice management UI in `admin-web` that covers list, create, detail, edit, status actions, and delete.
- Follow established admin-web patterns for data fetching, table rendering, dialogs, state management, and testing.
- Handle all backend error contracts (409 conflicts, 422 domain errors, 403/404) with user-visible feedback and state refresh.
- Enable invoices navigation for Admin and PM users.

**Non-Goals:**

- No backend, shared contract, database, migration, or OpenAPI changes.
- No PDF generation, email delivery, or payment processing.
- No `user-web` invoice surfaces — invoices are Admin/PM only.
- No dashboard "Open Invoices" metric in this change (tracked separately).
- No new shared component extraction unless a proven identical pattern emerges during implementation.

## Decisions

### 1. Data fetching: TanStack query pattern

Use TanStack vue-query composables (like `useReportsData`) rather than ref-based local-state composables (like `useAdminProjectsData`).

**Rationale:** The invoices page has list + stats + eligible-entries + detail reads, plus create/update/delete mutations. Query cache invalidation after mutations is cleaner than manual refresh refs. The reports and settings pages already use this pattern successfully.

**Alternative:** Ref-based pattern (`useAdminProjectsData`) — simpler but requires manual refresh orchestration and doesn't cache the detail page data for back-navigation.

### 2. File structure

Group new files under `apps/admin-web/src/` following the established layout:

- `services/admin-invoices-client.ts` (+ `.spec.ts`) — typed client wrapping the 7 endpoints
- `lib/query-keys.ts` — add `adminInvoicesKeys` factory + `afterInvoiceMutation` invalidation helper
- `composables/invoices/` — `useInvoicesData` (list + stats), `useInvoiceDetail`, `useInvoiceCreate`, `useInvoiceUpdate`, `useInvoiceDelete`, `useEligibleEntriesPreview` (each with focused tests)
- `views/InvoicesView.vue` (+ `.spec.ts`) — list page (replace placeholder)
- `views/InvoiceDetailView.vue` (+ `.spec.ts`) — detail page
- `components/invoices/InvoicesTable.vue` — presentational table component
- `components/invoices/InvoiceCreateDialog.vue` — create modal
- `components/invoices/InvoiceStatusBadge.vue` — status badge helper
- `components/loading/ManagementPageSkeleton` — add `invoices` variant

**Rationale:** Matches the established per-domain composable directory pattern (cf. `composables/projects/`, `composables/members/`, `composables/reports/`).

### 3. Invoice detail route

Add `invoices/:id` as a protected child route under the admin shell, with `allowedRoles: managementRoles` (Admin+PM), lazy-loaded `InvoiceDetailView`, and `pageName: 'Invoices'` (the topbar shows 'Invoices' for both the list and detail routes; a dynamic breadcrumb with the invoice title is not implemented because the current WorkspaceHeader architecture only supports a static page name).

**Rationale:** The `admin-routing` spec already lists `invoices` in the route inventory. Adding the detail sub-route is the minimal extension. The route reuses the existing shell and role guard infrastructure.

### 4. Status badge severity mapping

Map invoice statuses to PrimeVue Tag severity: `draft` → `warn`, `sent` → `default` (accent-tint + text-brand), `paid` → `success`.

**Rationale:** `components.md` defines "Pending/Draft → warn" and "Completed → default" and "Running/Active → success". The `.pen` frame has no "sent" example and uses "Pending" instead of "draft". The docs override the pen. This mapping is consistent: draft is a pending state (warn), sent is a completed step (default/brand), paid is the terminal active state (success).

### 5. Create dialog eligible-entries preview

Fetch preview data via `GET /invoices/eligible-entries` when the user has entered both date range bounds (and projectId for PMs). The preview request is gated by query key nullability (both date bounds must be set) and TanStack Query's built-in deduplication; no explicit debounce timer is needed. Pre-fill hourly rate and currency from `defaultHourlyRate` / `defaultCurrency` in the preview response. Show the expandable entries table with count, total hours, and computed amount.

**Rationale:** The docs specify live calculated fields from the preview endpoint. The preview is read-only and does not write. Gating on both date bounds and TanStack Query deduplication avoid excessive requests during date range editing.

### 6. Error handling strategy

Map API error codes to user-visible messages:
- `invoice_rate_required` / `invoice_currency_required` → "Please provide an hourly rate" / "Please provide a currency" (or workspace defaults must be configured)
- `invoice_total_overflow` → "The total amount exceeds the maximum allowed value"
- `invoice_update_conflict` → "This invoice was modified by another user. Please review and try again" + reload detail
- `invoice_invalid_status_transition` → "This status change is not allowed" + reload detail
- `invoice_not_deletable` → "This invoice can no longer be deleted because its status changed" + reload detail
- 403 → "You do not have permission to perform this action"
- 404 → "Invoice not found"

All errors surface as toast notifications. Conflict errors (409) additionally trigger a detail reload to resync local state with the server. The existing `getErrorMessage` helper from `@gitiempo/web-shared` provides the `message → error → status` fallback parsing.

### 7. Currency formatting helper

Add a small `formatCurrency(amount, currency)` utility in `apps/admin-web/src/lib/` (or `apps/admin-web/src/utils/`) that wraps `Intl.NumberFormat('en-US', { style: 'currency', currency })`. Used in list table, detail summary, create dialog, and stats cards.

**Rationale:** The docs mandate `Intl.NumberFormat` with the API currency field, never hardcoded symbols. A single helper prevents drift. App-local because no `user-web` usage exists.

### 8. Mobile responsive list

Use `useIsMobileViewport` from `@gitiempo/web-shared` to switch between desktop `DataTable` (inside `ManagementTableShell`) and mobile `MobileRecordCard` rows with `MobileRecordMetadataList`, following the established pattern from Members and Projects pages.

**Rationale:** The admin-web responsive record-list workflow mandates preserving the desktop table and switching to stacked cards below 640px. The shared `MobileRecordCard` and app-local `MobileRecordMetadataList` are already available.

## Design Parity Deltas (.pen vs docs)

The approved `Admin Invoices` `.pen` frame (id `mL7wF`, 1280x1040) has been updated to match the current docs. The following deltas were resolved by modifying the `.pen` frame itself. Per project rules, docs remain the source of truth; the `.pen` now reflects the same design intent.

### Table columns

- **.pen:** 4 columns - Invoice, Project, Amount, Status
- **Docs (`pages-admin.md`):** 6 columns - Title, Project, Period (dateFrom-dateTo), Hours (totalHours), Amount (totalAmount with currency), Status badge
- **Resolution:** Implement 6 columns per docs. The `.pen` lacks Period and Hours columns because it predates the API contract.

### Status model

- **.pen:** Shows "Pending", "Draft", "Paid" badges
- **Docs/API:** Only `draft`, `sent`, `paid` - no "Pending" status
- **Resolution:** Implement draft/sent/paid only. The `.pen`'s "Pending" badge is a legacy label; the API's `draft` status replaces it.

### Status badge severity

- **.pen:** Pending -> warn (warn-bg/warn-text), Draft -> default (accent-tint/brand), Paid -> success (active-bg/active-text)
- **Docs (`components.md`):** "Pending/Draft -> warn", "Completed -> default", "Running/Active -> success"
- **Resolution (Decision 4):** draft -> warn, sent -> default (accent-tint + text-brand), paid -> success. The `.pen` has no "sent" example. `draft` takes the warn severity per `components.md`'s "Pending/Draft -> warn" rule, even though the `.pen` shows Draft with default severity.

### Filter row

- **.pen:** 4 filter cells - "Filter invoice" (text), "All projects" (dropdown), "Any amount" (text), "All statuses" (dropdown)
- **Docs:** Project dropdown, Date range picker, Status dropdown. No amount filter (API does not support it). Global search filters by title via API `search` param.
- **Resolution:** Implement 3 filters (Project, Date range, Status) per docs. No amount filter. No per-column title text filter - title search is the global search control in the table header.

### Stats card subtitles

- **.pen:** "3 pending approval" / "Across 7 projects" / "Ready for review"
- **Docs:** "N ready to send" (N=draft count) / "N invoices - M projects" / "Ready for review"
- **Resolution:** Implement docs subtitles. The "Drafts" subtitle "Ready for review" matches both.

### Card padding

- **.pen:** `invoiceCard` uses padding-20 (p-5)
- **Docs (`components.md`):** Page-level cards use SurfaceCard default p-6; p-5 only for documented Settings exceptions
- **Resolution:** Use SurfaceCard default p-6. The `.pen`'s 20px padding is not a documented exception for this surface.

### Row height

- **.pen:** Body rows are h-52 (52px)
- **Docs (`components.md`):** Body row h-12 (48px)
- **Resolution:** Use h-12 per docs.

### Amount column alignment

- **.pen:** Amount column is left-aligned (default cell alignment)
- **Docs (`components.md`):** "Right align numeric columns"
- **Resolution:** Right-align the Amount column per docs.

### Row title content

- **.pen:** Shows invoice IDs like "INV-2026-041" in brand color as the first column
- **Docs/API:** The API returns `title` (string), not an invoice number. The column header is "Title".
- **Resolution:** Display the invoice `title` field, styled as a brand-colored link. The `.pen`'s ID-like labels are placeholder content.

### Pagination

- **.pen:** No pagination control visible
- **Docs:** Pagination control below the table (API returns `meta.totalPages`)
- **Resolution:** Implement `<Paginator>` below the table per docs and `patterns.md`.

### Create dialog contents

- **.pen dialog:** Fields - Project (AutoComplete), Date range, Hourly rate, Discount, Total amount (calculated, read-only). Actions - Preview invoice, Send invoice, Delete invoice, Save changes.
- **Docs:** Fields - Title (required), Project (optional), Date range (required), Hourly rate, Currency, Discount, Notes. Expandable eligible-entries preview section. Actions - Cancel + Create invoice only. No Status field.
- **Resolution:** Implement docs create dialog. The `.pen` dialog is a reference frame for an edit dialog concept; docs moved status transitions and delete to the detail page header. The `.pen` dialog predates the create-vs-edit separation.

### Dialog input height

- **.pen:** Dialog input controls are 34px high
- **Docs (`components.md`):** Single-line height h-[38px]
- **Resolution:** Use h-[38px] per docs with shared web-config PT exports.

### Confirm dialog

- **.pen:** Title "Delete invoice?", body "This action cannot be undone. The invoice record will be removed from the list.", actions: Cancel (outlined, right) + filled destructive icon-only (trash-2, right)
- **Docs (`patterns.md` + `pages-admin.md`):** Body "Delete this invoice? Linked time entries will be unlinked and become available for future invoices." Footer: destructive outlined accept on the LEFT, secondary outlined cancel on the RIGHT (`flex flex-row-reverse justify-between`). Use `<ConfirmDialog>` + `useConfirm()`.
- **Resolution:** Implement docs confirm dialog pattern with docs copy and row-reverse footer layout.

### Missing from .pen (now added)

- **Detail page:** No `.pen` frame exists for `/invoices/:id`. The detail page is documented in `pages-admin.md` and builds from SurfaceCard patterns, topbar breadcrumb, and status-conditional header actions. A `.pen` frame for the detail page is not added in this change; it can be created as a follow-up if visual parity review requires it.
- **Loading skeleton:** No `.pen` skeleton state. Implement `ManagementPageSkeleton` invoices variant matching stats + table structure.
- **Empty state:** No `.pen` empty state. Implement per `components.md` empty-state pattern.
- **Error/retry state:** No `.pen` error state. Implement per `components.md` and established admin-web pattern (RequestErrorCard).
- **Mobile responsive:** No `.pen` mobile variant. Implement per responsive record-list workflow (stacked cards below 640px).
- **Eligible-entries preview:** Added to the `.pen` create dialog as an expandable `previewSection` frame with a header row (chevron-right icon + "Eligible time entries" + summary text) and a divider line. The full entries table inside the expanded section is not rendered in the `.pen`; implement per docs create dialog spec.

## Risks / Trade-offs

- **[Preview request timing]** Fetching eligible entries requires both date bounds. If the user enters dates one at a time, the preview won't fire until both are set. → Mitigation: disable preview until both bounds are present; show a hint in the expandable section.
- **[PM project list for create dialog]** The create dialog needs the PM's assigned project list for the Project dropdown. The existing `admin-projects-client` lists projects, but PM-scoped visibility is enforced server-side. → Mitigation: reuse the existing project list endpoint; the backend already returns only visible projects for PMs.
- **[Detail route breadcrumb]** The topbar shows a static 'Invoices' page name for the detail route rather than the invoice title. The current WorkspaceHeader component only accepts a single `pageName` string and has no mechanism for dynamic breadcrumb updates from child route views. A future enhancement could add a dynamic breadcrumb slot to the shell. The detail page header itself shows the invoice title and status badge, so the invoice identity is still visible to the user.
- **[Stale eligible entries on create]** The preview is a read-only snapshot; entries could become ineligible between preview and create submission. → Mitigation: the backend's `FOR UPDATE` + `invoiceId IS NULL` check prevents double-billing. The create response returns the actual linked entries. If zero entries were linked (all became ineligible), show a toast indicating the invoice was created with no entries.
- **[Stats multi-currency note]** The "Billed This Month" stat sums amounts in a single currency returned by the API. The `InvoiceStatsResponse` returns a single `currency` field for `thisMonth`, so the UI cannot detect or display a multi-currency approximation note. The spec's multi-currency scenario is documented as a future enhancement pending API support for per-currency breakdown.
- **[Detail header long titles]** No `.pen` frame exists for `/invoices/:id`, so long-title header behavior was never visually specified. Saving an unbreakable ~223-character title pushed the status badge and status actions off-screen at 1440px. → Mitigation: the detail header title group gets `min-w-0`, the title truncates with an ellipsis (matching the `InvoicesTable` title-column precedent instead of `break-words`), and the status actions group gets `shrink-0`. The full title stays in the DOM and remains visible in the editable Title input. Covered by a long-title regression test in `InvoiceDetailView.spec.ts`.
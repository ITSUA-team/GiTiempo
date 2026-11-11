# Invoice management design

## Context

The current API uses a nullable invoice ID on each time entry, a transactional create operation and per-entry rounding. Its update path accepts title, notes and a forward status transition. The Admin SPA already loads invoice defaults separately from Settings. The API already renders report PDFs with pdfmake. Extend these paths so the editor preview, committed invoice and download use the same billing calculation.

Design source: `GITiempo.pen` at commit `c5180df6`. Frame IDs below point to editable frames and their interaction notes.

| Workflow | Desktop | Mobile and secondary states |
| --- | --- | --- |
| Personal groups, filters and bulk selection | mL7wF | mInvM1, i527_1240, i527_1304, i527_1317, i527_1325, i527_1335, i527_1341, i527_1354 |
| Detail, reversible status and draft deletion | i527_0281, i527_1252 | i527_1217, i527_1283, i527_1291 |
| Create, edit, review entries and copy | i527_0633, i527_0457, i527_1274 | i527_1142, i527_0970, i527_1366, i527_1532 |
| Invoice document and export failure | i527_0712 | i527_1360 |
| Workspace invoice defaults | h8YRz | i527_1513 |

The interaction notes in i527_1526 apply across these screens. The example names, groups, references and amounts are sample data.

## Goals / Non-Goals

Deliver one consistent saved invoice revision across API, editor and PDF, and keep each user's organization independent. Manual status selection has no delivery or payment processing effect. Nested/shared folders, external delivery, payment collection and free-form manual charge lines are outside this issue.

## Decisions

### Shared contracts and API boundary

Extend `packages/shared/src/contracts/invoices.ts` and the workspace settings contracts first. Keep `GET /invoices/eligible-entries` compatible for discovery. Add a read-only calculation request accepting the proposed scope, editor invoice ID when present, selected IDs and billing inputs in the body. Return authoritative totals and eligibility conflicts. A body accommodates large selections without putting IDs or business details in query strings. Use the same calculation in save. Preserve workspace-timezone date boundaries, existing per-entry ceiling rounding, centihour and amount precision, and overflow checks. Surface subtotal, discount and final amount consistently, including when individual amounts need cent allocation to reconcile to the saved subtotal.

For create, omitted entry IDs preserve the existing automatic selection. An explicit empty list means zero entries. On edit, omission retains existing links. If a scope change would invalidate those links, require a reviewed selection. Add a server revision to detail and a precondition for writes by the new editor and status selector. Older partial update callers can continue using the existing contract. Full-edit clients must never silently overwrite an intervening change.

### Backend and persistence — apps/api

Follow `apps/api/AGENTS.md`. Extend the invoices controller, service, schemas and migrations, and the workspace settings service. Use one transaction for a business save. Authorize the existing invoice and requested destination scope, lock the invoice and compare the submitted revision, then lock candidate time entries in deterministic order. Recheck eligibility and ownership under lock. Conditionally claim new entries, verify the affected IDs, release exclusions, persist line snapshots, recalculate and save totals. Failure rolls everything back. A group selection saved through this dialog participates in the same transaction. Dedicated group moves bypass the business revision entirely.

Persist parties, services, payment details and optional immutable logo reference per invoice. Freeze the customer-visible line labels and billed durations with the saved revision. Settings edits or later task renames must not change an exported invoice. Reuse retained lines on unrelated edits. Allocate a unique workspace reference on successful creation using the workspace prefix and a concurrency-safe sequence. Prefix changes affect future references. A new invoice from a source goes through the normal create endpoint with freshly reviewed IDs. Copy reusable terms and fields, resolve any generated payment reference from the new invoice number, and discard source audit data and status. Cancel before submit writes nothing.

Add owner- and workspace-scoped group records and a membership table keyed by workspace, user and invoice. Use relational constraints for matching workspace and owner. Compute group counts after applying the same invoice access predicate used for listing; the built-in views are queries. Use one transaction to validate every selected invoice and replace only the caller's memberships. Group deletion cascades through memberships only. Do not update a shared invoice column to store a user's group.

### Settings and export

Admins write workspace billing defaults. The existing `GET /invoices/defaults` returns a billing-only projection for authorized invoice users. Prefill a new invoice once. An explicit “Use settings” in an editor refreshes the local draft and requires saving to affect the invoice. The optional PNG/SVG logo must be size-bounded, type-validated and stored by immutable asset identity. Sanitize or rasterize SVG without scripts or external resources before rendering. Replacing or removing a workspace logo preserves copies referenced by invoices.

Serve a protected PDF attachment for the selected invoice. Authorize through the invoice detail policy and render from one consistent persisted revision. Reuse the backend pdfmake setup with an invoice-specific A4 layout and a font supporting customer text, including Ukrainian. Repeat line headings and page footers, wrap long descriptions and show the final total once. The render pipeline receives only document fields. For an older invoice with missing issuer, recipient, services or payment information, identify the missing sections and route the user to the editor before export. Never invent historical values from today's defaults.

### Admin SPA — apps/admin-web

Follow `apps/admin-web/AGENTS.md` and `docs/ui/pages-admin.md`. Extend the invoice client and the existing list/detail/defaults/preview composables. Reuse a single create/edit form with an explicit new-draft mode for duplication. Display the saved invoice separately from editor state. Refresh the authoritative status on conflict and highlight newly unavailable entries while retaining the user's edits. Disable repeated submits and preserve selected rows through bulk-move failure.

Scope cached groups, counts and list queries to the signed-in user, active workspace, group and applicable filters. Clear selection on scope change; refresh affected lists, counts, detail and stats after successful writes. In the desktop list use the group rail and selection toolbar. Below 640 px use the mobile picker, cards and full-width filters. Check modal keyboard focus, scrollable content and reachable footer actions. A local validation or export error must distinguish correction from retry.

## Risks / Trade-offs

- A concurrent editor or another invoice can claim a selected entry between preview and save. Return a conflict without partial writes and refresh eligibility while preserving draft values.
- Migrating historical lines can only capture descriptions still available. Preserve original financial totals and existing links, record unknown historical fields as missing, and require explicit review before changing them.
- The active change `reduce-redundant-spa-notifications` replaces several of the same Admin UI requirements. The overlapping create/detail requirements have been reconciled to the #527 editor and reversible statuses in both deltas. Both retain quiet successes and actionable failures. Recheck these identical replacements at sync/archive time whichever change lands first.

## Migration Plan

1. Add nullable document/profile fields, revision and reference support, immutable logo storage and personal group tables. Backfill stable, unique references idempotently for each workspace. Snapshot available linked-line display data. Keep missing billing identity or payment details unset.
2. Validate uniqueness, preserved links, existing totals and status before enforcing reference constraints. Serve compatible API contracts before enabling the new Admin UI. Existing invoices appear in Ungrouped for each user initially.
3. Roll back the UI first if needed. Keep the compatible API, new columns and persisted invoices/groups while investigating. Reverting to a backend that cannot maintain edited invoice revisions requires suspending invoice writes first.

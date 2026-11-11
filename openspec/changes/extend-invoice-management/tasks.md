# Implementation tasks

## 1. Shared contracts

- [x] 1.1 Extend the billing profile, invoice detail, create and patch schemas. Verify legacy payloads, explicit nulls, scope, revision preconditions, read-only fields and all three status values in shared schema tests.
- [x] 1.2 Define eligibility/calculation, group filtering, counts, bulk assignment and PDF error contracts. Verify omitted versus empty entry selections, invalid IDs, duplicate IDs and built-in group views in contract tests.

## 2. API and persistence

- [x] 2.1 Add workspace billing profiles, immutable logo assets, reference allocation, invoice revision and document snapshots. Rehearse the migration on pre-#527 invoices and confirm unchanged IDs, links, totals and useful missing-field representations. Document the migration in docs/DATA-MODEL.md.
- [x] 2.2 Add personal groups, owner/workspace constraints and single-membership uniqueness. Verify independent organization of the same invoice and deletion cascades using database integration tests.
- [x] 2.3 Extend Admin settings writes and the invoice defaults projection. Verify Admin update, authorized PM read, member denial, invalid logo rejection and preservation of existing invoice logos and bank details after replacement.
- [x] 2.4 Extend invoice eligibility and calculation to cover owned entries and a reviewed selection. Check workspace-local date boundaries, scope changes, fractional-cent rounding, overflow, and zero-entry drafts against existing billing fixtures.
- [x] 2.5 Implement atomic create and revision with guarded claims, conflict detection, reference allocation and optional personal membership. Exercise overlapping concurrent saves, partial failure, stale edits, released entries and PM source/destination access in invoice API tests.
- [x] 2.6 Replace forward-only transitions. Verify every status pair, manual status effects, stats/filter refresh and Admin-only draft deletion after a reversal.
- [x] 2.7 Add personal group CRUD, filtered list/counts and atomic moves. Test two users and two workspaces, revoked access, forged IDs, mixed bulk failures, remove-to-Ungrouped and persistence across sessions.
- [x] 2.8 Render authorized PDF attachments using saved document revisions. Extract text and inspect paginated A4 samples with and without logos, long and Ukrainian text, a discount and excluded entries. Verify a direct unauthorized download returns no bytes and incomplete historical data returns actionable validation.
- [x] 2.9 Export OpenAPI, update docs/API-ENDPOINTS.md and relevant Bruno requests. Verify the documented payloads, errors and PDF media type against the running API.

## 3. Admin SPA

- [x] 3.1 Extend the invoice client, cache keys and mutations. Verify user/workspace switching, invalidation after business edits versus group moves and retention of draft state on conflict in composable tests.
- [x] 3.2 Build the desktop group rail and mobile group picker, CRUD dialogs, scoped list selection and bulk move/remove. Check group counts, filters, duplicate names, empty, loading, retry and unchanged-destination states against the listed frames.
- [x] 3.3 Build the shared create/edit form with party, service, payment and billing fields, entry checkboxes and calculation preview. Verify retained/excluded entries, zero-hour invoices and retry after concurrent entry claims without losing typed fields.
- [x] 3.4 Add detail actions for reversible status, copy, PDF export and draft deletion. Verify the copy period/group step, cancellation, a fresh reference on save and source independence. Cover PDF progress, missing fields and retry states.
- [x] 3.5 Add Admin sender/payment settings, prefix and optional logo actions. Verify desktop and mobile form validation, failure recovery and that permitted PMs load only invoice defaults.
- [x] 3.6 Update docs/ui/pages-admin.md and docs/PROPOSAL.md to match #527. Compare desktop and mobile behavior against the frame IDs in design.md, including keyboard focus and reachable modal actions below 640 px.

## 4. Integration

- [x] 4.1 Manually exercise the invoice workflow in the running Admin SPA on desktop and below 640 px. As Admin, save sender/payment defaults, create an invoice, then change the defaults and confirm the saved invoice retains its details. As an authorized PM, use defaults within an accessible project, edit a Sent invoice, exclude an entry and verify the preview and saved totals agree. Return Sent to Draft, copy into a new period and verify the new reference, source independence and eligibility of released entries. Open the downloaded PDF and compare its parties, charges, payment instructions and total with the saved invoice.
- [x] 4.2 Run pnpm typecheck, pnpm lint, pnpm test, pnpm test:e2e and strict OpenSpec validation. Record results and reconcile the overlapping admin-invoices-page notification delta before syncing the completed change.
- [x] 4.3 Manually create, rename and delete personal groups on desktop and mobile. Move one invoice, then several, between groups. Check counts and Ungrouped after deletion. Open the same invoice as the second user and verify their grouping is independent. Trigger a stale edit from two sessions and verify the editor preserves inputs for retry.
- [x] 4.4 Record the tested build, roles, viewports and pass/fail result for each manual scenario in #527 or its PR. Record defects with reproduction steps, fix them and record a passing manual retest before accepting the change.

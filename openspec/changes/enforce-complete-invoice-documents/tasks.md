# Tasks

Implementation progress and verification limits are recorded below and in the evidence directory. The user-authorized local JSON design follow-up completed task 1.2 after implementation; the original preparation timing was missed, as recorded in `evidence/design-parity.md`. See the two capability deltas for acceptance scenarios and `design.md` for the requiredness matrix and file ownership. No user-web product changes are planned.

## 1. Docs and design preparation

- [x] 1.1 Integrate or account for #535/PR #551 before implementing #537; verify its independent field-error clearing and Issue date input-border regression coverage are retained and no duplicate validation path is introduced.
- [x] 1.2 Inspect and update the existing invoice desktop/mobile frames in `GITiempo.pen` for PDF semantic order, required markers, one save action, contextual payment fields and validation states; deliver a concrete parity checklist against the field/order matrix in `design.md` before frontend edits.
- [x] 1.3 Update the invoice rules in `docs/ui/pages-admin.md` and relevant form guidance for required fields, strict Draft/status saves, optional fields and historical correction; verify the prose matches the confirmed matrix and distinguishes complete invoices from partial workspace defaults.

## 2. Shared contracts and validation

- [x] 2.1 Add backend-safe complete resolved invoice validation using existing field/date/numeric/logo bounds and stable issue paths, while retaining tolerant request omission, PATCH, response and billing-default shapes; verify focused `packages/shared/src/contracts/invoices.spec.ts` cases for every required field, whitespace, optional fields, invalid values and zero rate.
- [x] 2.2 Implement method-aware requiredness and applicable document projection without requiring inactive payment fields; verify shared cases for Bank transfer, Card HTTPS links, Other/custom Payment details, method-name preservation, existing `payment.account` mapping for Other/custom and optional instructions for all methods.
- [x] 2.3 Add compatibility cases for partial workspace profiles, incomplete historical response parsing and calculation-preview inputs without parties/payment; run the shared package tests, lint, typecheck and build successfully before downstream API/admin work.

## 3. API

- [x] 3.1 Guard creation after supported defaults/date/rate/currency resolution and before invoice/reference/link/group writes; verify service tests cover complete defaults, explicit invalid overrides, missing required sections, complete zero-entry invoices and unchanged rate/currency-required domain codes.
- [x] 3.2 Guard the locked merged PATCH candidate before every mutation and before the unchanged-status early return; verify tests cover valid partial updates, clearing required values, complete historical correction, status-only/current-status/mode-only requests on incomplete records, revision conflicts and no committed field/link/group/total changes on rejection.
- [x] 3.3 Apply the same complete-document policy to PDF eligibility after authorization and historical Issue date resolution; verify PDF/service tests cover all required fields, valid saved Drafts for each payment method, zero-entry exports, omitted optional fields and actionable `invoice_document_incomplete` details, while retaining pagination and arithmetic assertions.
- [x] 3.4 Extend `apps/api/test/invoices.e2e-spec.ts` with direct invalid POST/PATCH/status requests, successful complete Draft creation, merged partial correction, historical read/preview/default compatibility and Admin/PM access cases; update ordinary creation fixtures to complete documents and retain intentionally incomplete historical fixtures. Verify the API unit suite and isolated E2E suite via `pnpm api:e2e:docker`, with no development database use.
- [x] 3.5 Document resolved completeness, conditional payment requirements and field-addressed errors in the existing API/OpenAPI contracts; regenerate `packages/shared/openapi.json` with the working export workflow described in `apps/api/AGENTS.md`, inspect for unrelated drift, and verify API lint/typecheck and client contract parsing tests pass.

## 4. Admin-web

- [x] 4.1 Connect create/edit/create-from validation to the shared complete-document policy, using a focused app-local helper/composable only where needed; verify component tests block incomplete/invalid saves without requests, preserve all inputs/selections, accept valid defaults and zero-entry documents, and keep one primary save action with separate status handling.
- [x] 4.2 Add contextual required markers/semantics, remove optional label suffixes and map inline errors on party, service, payment and date controls; verify component tests cover multiple simultaneous errors, independent correction, first-error focus/scroll, associated helper text, actual Issue date invalid styling and no generic local-validation toast.
- [x] 4.3 Preserve hidden local payment edits while submitting the applicable projection; verify payment/editor tests switch Bank transfer → Card → Bank transfer and back, restore entered values, ignore inactive local URL errors during Bank transfer save, and enforce provider/HTTPS link or Other/custom Payment details only when applicable. Verify workspace defaults still accept partial inputs.
- [x] 4.4 Reorder the existing form sections and controls to the PDF semantic sequence in `design.md`, preserving entry selection, pricing and preview behavior; verify desktop/mobile DOM and focus order, party inner-field order, secondary title/group placement, discount/totals before payment, and notes last.
- [x] 4.5 Wire historical completion and field-addressed server errors through existing invoice client/composables and the detail status action; verify an assembled detail/editor integration test allows reading/opening/copying incomplete data, blocks save/status with actionable corrections, preserves saved status and unsaved input on failure, and succeeds after completion without changing the source or sending email/exporting PDF.
- [x] 4.6 Run admin-web tests, lint, typecheck and build with shared dependencies built; verify all new form/status integration cases and the #535 regressions pass. If shared frontend code is actually changed, inspect its nearest instructions and run both user-web and admin-web tests, lint and typecheck before checking this task.

## 5. Integration and acceptance

- [x] 5.1 Run root `pnpm lint`, `pnpm typecheck` and `pnpm test` after integration, and confirm the isolated API E2E results remain applicable to the final revision; record command outcomes and any explicit verification gap without marking failed work complete.
- [x] 5.2 Manually exercise real create, edit, create-from and status workflows on desktop and mobile using complete and historical invoices for Bank transfer, Card and Other/custom; include missing/invalid values, optional omissions, zero-entry selection, keyboard correction and retry. Record PASS/FAIL/BLOCKED per scenario with revision, environment and durable screenshots/evidence.
- [x] 5.3 Save and download representative Draft PDFs in both time display modes, compare each applicable field and its semantic order against the editor, and verify zero-entry totals, optional omissions and selected payment output. Complete the final `GITiempo.pen` parity/reuse/PrimeVue exception review, explicitly recording any remaining delta.
- [x] 5.4 Run `pnpm exec openspec validate enforce-complete-invoice-documents --strict` on the final change and verify all implementation tasks have evidence before declaring implementation complete.

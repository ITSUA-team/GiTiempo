# Design

## Context

See `proposal.md` for the agreed scope and the explicit override of #537's incomplete-draft request.

- `packages/shared/src/contracts/invoices.ts` reuses tolerant party/payment schemas for invoice responses and workspace billing defaults. Globally making those schemas nonempty would break partial defaults and historical reads. Preview also derives input shapes from create contracts.
- `apps/api/src/invoices/services/invoices.service.ts` resolves defaults during create and merges PATCH values with a locked saved invoice. The unchanged-status early return currently precedes merged validation. Entry/group writes occur later in the transaction.
- `invoice-pdf.ts` currently checks only sender name, recipient name, services and payment method. Its semantic order is metadata, parties, services/project, work, totals, payment and notes; pagination can relocate totals.
- `InvoiceCreateDialog.vue` serves create, edit and create-from. Its current ordering puts services/pricing before parties and payment before work selection. `InvoiceDetailView.vue` owns a separate status action.
- Existing `invoices-api` scenarios explicitly allow incomplete historical status changes and an optional Card link. The delta replaces those promises. Zero-entry invoices remain supported.
- Follow root `AGENTS.md`, `apps/api/AGENTS.md`, `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, the form rules in `components.md`, invoice rules in `pages-admin.md`, and dialog/notification rules in `patterns.md`.

## Goals / Non-Goals

**Goals:** One backend-safe, field-addressed complete-document policy shared by API, editor and PDF eligibility; correct validation of effective data; unchanged historical read compatibility and atomic billing behavior.

**Non-Goals:** No legal certification of invoices, verification that an email/account belongs to a real person, country-specific tax/bank rules, additional required work entries, changed monetary arithmetic, data migrations, new status model, new transport client, or redesign of PDF pagination and detail display.

## Decisions

### 1. Separate complete-document validation from tolerant data shapes

Add a focused complete resolved invoice schema/validator beside the existing invoice contracts in `packages/shared`. Reuse existing field bounds and date/numeric/logo rules. Export structured issues with stable paths such as `sender.email`, `recipient.address`, `payment.account`, `payment.paymentUrl`, `issueDate` and `dateTo`. Keep it independent of browser APIs.

Keep request DTOs able to represent omitted supported defaults and partial PATCH values; keep response/default schemas tolerant. Do not make the shared billing profile strict for completeness. Do not make calculation previews depend on party/payment completeness. The alternative of tightening `invoicePartySchema` everywhere would affect unrelated settings and prevent historical correction.

The requiredness matrix is the same in all statuses:

| Field | Requirement |
| --- | --- |
| Title | Existing required trimmed title, maximum 255 characters; management metadata, absent from PDF |
| Sender and recipient | Name/legal name, address, valid email required for both; Tax ID optional |
| Services | Required trimmed nonempty description |
| Issue date | Required valid resolved calendar date; existing create default and historical fallback preserved |
| Billing period | Both valid bounds required; end on/after start |
| Due date | Optional/null; if set, on/after Issue date |
| Hourly rate / currency | Required effective values; preserve supported defaults, zero rate, precision, bounds and uppercase three-letter currency rules |
| Bank transfer | Method, beneficiary, provider/bank and account/IBAN required; SWIFT/BIC, terms and instructions optional |
| Card | Method, provider and HTTPS payment URL required; terms and instructions optional |
| Other/custom | Nonblank method name and existing account field labelled Payment details required; beneficiary, provider and instructions optional |
| Discount / rounding / time mode | Preserve existing defaults, allowed values and limits; no new manual-entry requirement |
| Project | Existing scope policy: required for PM, optional for Admin |
| Notes / logo / personal group | Optional; existing validity/access constraints apply |
| Work entries | May be empty; generated reference, audit fields and calculated totals stay server-controlled |

Required text must remain nonempty after trimming. Populated optional fields retain existing validity rules. No new Tax ID or SWIFT checksum rule is inferred from requiredness. A bank account is required text, not an invented country-specific IBAN validator. “Valid” refers to the product's supported formats and constraints, not factual verification of identity or payment ownership.

### 2. Validate resolved data before mutations

**Create:** retain authorization and eligibility checks; resolve supported sender/payment defaults, rate, currency, Issue date and rounding; validate the resulting document before invoice insertion, reference allocation or entry/group writes. Omitted fields can use supported defaults, but explicit empty/null required values cannot silently fall back. Preserve existing rate/currency-required domain codes.

**PATCH:** retain scope authorization, row lock and expected-revision conflict checks; form the effective document using existing field replacement/merge semantics and saved values for omitted fields. Validate it before entry-link, personal-group or invoice mutation. Run this check before the current unchanged-status early return, so sending the current status cannot bypass historical completeness. A complete valid unchanged-status request remains a no-op.

Apply the guard to all invoice PATCH writes, including status-only, mode-only and group fields supplied through PATCH. Standalone group-move endpoints and deletion do not revise the business document and retain existing rules. Preview remains a calculation-only endpoint.

Retain `invoice_update_conflict`/claim-conflict semantics and existing access checks. Completeness failures use the existing API validation envelope with structured field paths; map those through the current invoice client rather than adding transport infrastructure. No rejected write commits totals, revisions, links or group changes.

### 3. Share policy across the editor and PDF without losing hidden edits

The editor validates the full form before emitting a save. It applies PrimeVue invalid styling, `aria-invalid`, associated helper text and required semantics to actual inputs, including Issue date. Show missing-field errors after a save attempt; clear each independently on correction. Keep the primary action reachable for validation attempts rather than leaving missing fields unexplained behind a disabled button. Pending requests and invalid billing previews can still prevent submission for their existing reasons.

Keep one primary save action with the existing mode-appropriate label; there is no Save as Draft path. Creation creates Draft, edit preserves status, and the detail selector remains a separate operation. Before a status request, validate the saved document and offer correction when incomplete, retaining the prior status. Do not silently send unsaved editor values with a status action.

Payment field requiredness is contextual. Preserve hidden values in the local form when switching methods. Build and validate an applicable payment projection for the write and document: Card omits bank-only fields; Bank transfer and Other/custom omit the Card URL; irrelevant SWIFT is not required or exported. An invalid inactive local Card URL must not prevent a valid Bank transfer save, but switching back to Card restores it for correction. Apply existing bounds to applicable populated fields. Preserve the existing Other/custom mapping: Payment details is `payment.account`; Payment instructions remains the separate optional `payment.instructions` field. Do not move historical account content or introduce a new required instructions field. Direct API payloads still undergo existing structural/type/format validation before resolution; clients must omit inactive malformed values rather than relying on the server to discard invalid input.

PDF eligibility uses the same resolved-document policy after authorization and the existing historical Issue date fallback. Retain the actionable `invoice_document_incomplete` response family for historical completion, extending details to missing/invalid field paths. Saving a valid Draft must make it document-complete for PDF export, subject to ordinary access or rendering failures. Do not make response parsing invoke this strict validator.

### 4. Use PDF semantic order as the form structure

| Sequence | Form content |
| --- | --- |
| Header | Optional logo, saved reference when available; title/group presented as secondary management controls |
| Metadata | Issue date → Due date → billing period |
| Parties | From → Bill to; inside each: name → address → email → Tax ID |
| Service/work block | Services → project; time display/rounding and billing controls adjacent to work selection; rate and currency before the amounts they control |
| Totals | Calculated subtotal → discount control → calculated total |
| Payment | Method → terms → applicable beneficiary/provider/account or Card provider/link → Bank transfer SWIFT/BIC → optional instructions |
| Footer content | Notes |

Use the same DOM reading/focus order on mobile, stacking the party columns without CSS-only reordering. Do not duplicate editable sender details because the PDF repeats them in its header/footer. Internal title/group and billing tools have no direct PDF input counterpart and remain secondary beside their related section.

The design source is `GITiempo.pen`. The planned inspection/update before implementation was quota-blocked. On 2026-11-17 the user explicitly authorized direct local JSON editing; all eight desktop/mobile create/edit variants, contextual payment variants and validation examples were then updated and reviewed against this matrix and the implementation. See `evidence/design-parity.md` for the checklist, local layout review and remaining native-render limit. The original preparation sequence was missed; no retrospective before-implementation review or new native Pencil visual approval is claimed.

### 5. Planned files and coordination

**Shared (`packages/shared`):** `src/contracts/invoices.ts`, its exports if needed, `src/contracts/invoices.spec.ts`, and `openapi.json`. Keep tolerant schemas and strict resolved validation separately named and tested. Request omission/default semantics must be documented accurately in OpenAPI even though completeness is checked after resolution.

**API (`apps/api`, follow its `AGENTS.md`):** `src/invoices/services/invoices.service.ts`, `invoice-pdf.ts`, their unit tests, `test/invoices.e2e-spec.ts`, and historical-read tests where fixtures require explicit distinction. Update affected create fixtures to complete business documents rather than weakening expectations. Retain intentionally incomplete fixtures for legacy reads and rejection tests. No DB migration is needed.

**Admin (`apps/admin-web`, follow its `AGENTS.md`):** `InvoiceCreateDialog.vue`, `InvoicePaymentFields.vue`, `InvoiceDocumentDates.vue`, related field styling, and a focused validation helper/composable if needed to avoid enlarging the dialog. Wire field errors through existing invoice client/composables and the detail status action. Extend current component tests, client tests when error details change, and an assembled detail/editor integration test.

**Docs/design:** update the invoice/form paragraphs in `docs/ui/pages-admin.md` and related form guidance only where behavior changes; update the existing invoice frames in `GITiempo.pen`. No user-web product changes or shared frontend extraction are currently needed.

Integrate #535/PR #551 before implementation or explicitly account for its equivalent changes during integration. Preserve its independent field-error clearing, length/email checks and actual date-input invalid borders. This planning branch starts from main and contains no #535 implementation changes.

## Risks / Trade-offs

- [Previously accepted API writes fail] → Document the stricter write policy, cover default resolution and merged PATCH, and ship the editor with the backend change.
- [Historical records become uneditable] → Keep reads tolerant, allow opening the editor, and test completing all missing values in one save; require no data backfill.
- [Shared schemas accidentally block settings or preview] → Test partial billing profiles, historical responses and preview without document fields separately from strict validation.
- [Hidden payment values cause unrelated errors] → Keep local state but validate/persist the active projection; test switches in both directions.
- [Reordering breaks selection, mobile focus or error placement] → Preserve field state ownership, add DOM-order/integration coverage and real-page checks against PDF and updated design frames.
- [Fixtures conceal legacy compatibility] → Separate complete new-document factories from deliberately incomplete legacy fixtures and run unit plus isolated API E2E coverage.

## Migration Plan

1. Integrate the #535 validation baseline, prepare design frames/docs, and implement shared validation, API guards and editor wiring as one coordinated delivery.
2. Regenerate OpenAPI using the repository's working build-based export workflow if the root export command still has the documented decorator-metadata limitation. Verify no unrelated contract drift.
3. Run the focused suites, root lint/typecheck/tests, isolated API E2E, admin build and real-page desktop/mobile/PDF checks. Preserve evidence for historical completion, all payment methods and zero-entry invoices.
4. Deploy API and admin changes together. No stored data rewrite or schema rollout is required. A code rollback restores earlier write acceptance; valid invoices saved by the stricter version remain readable by the previous version.

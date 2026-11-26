# Proposal

## Why

[Issue #537](https://github.com/ITSUA-team/GiTiempo/issues/537) exposes incomplete invoice validation and unclear required fields. A saved Draft must contain the same complete, valid business document as other statuses, with an editor that follows the PDF's reading order.

## What Changes

- **BREAKING**: Require a complete resolved invoice on creation and every document save or status update, including Draft. Reject invalid values in both the editor and direct API requests.
- Require the existing title, both parties' names, addresses and emails, services, Issue date, billing period, rate and currency. Preserve existing PM project requirements and billing constraints.
- Require Bank transfer beneficiary, bank and account/IBAN; Card provider and HTTPS payment link; Other/custom method name and Payment details. Keep Tax ID, SWIFT/BIC, Due date, payment terms, notes and logo optional, with validation when supplied.
- Keep one primary Save action and a separate status selector. Creation remains Draft; editing preserves status unless explicitly changed. Do not add Save as Draft or a relaxed validation path.
- Put document fields in PDF semantic order, add required indicators, remove “optional” label suffixes, and provide inline, accessible field errors, including Issue date.
- Keep historical incomplete invoices readable and openable for correction; require completion before the next document save or status update. Preserve partial workspace defaults and read-only billing previews.
- Keep invoices with zero selected entries, zero hours and zero totals valid when their required document fields are complete.

The product owner confirmed these decisions on 2026-11-17. They supersede #537's original request for incomplete drafts and a separate Save as Draft button.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-invoices-page`: Complete document validation, required indicators, PDF-ordered create/edit/copy forms, method-specific payment requirements and correction flows for historical invoices.
- `invoices-api`: Authoritative completeness checks on resolved create and merged updates, strict status writes, matching PDF eligibility, and compatibility for reads, defaults and previews.

## Impact

- Multiple layers: `apps/admin-web`, `apps/api`, backend-safe invoice contracts/validation in `packages/shared`, invoice tests, OpenAPI documentation and relevant `docs/ui` guidance.
- Write acceptance becomes stricter without changing endpoint paths, statuses, authorization, invoice calculations or database schema. Existing clients sending incomplete invoice writes must complete their payload or saved document. Response/default schemas remain tolerant of historical and partial data.
- No authentication changes, data backfill, new dependencies, automatic email delivery or PDF redesign.
- Coordinate with [PR #551](https://github.com/ITSUA-team/GiTiempo/pull/551) for #535: retain its field error and Issue date highlighting fixes and extend their coverage; do not duplicate that work.

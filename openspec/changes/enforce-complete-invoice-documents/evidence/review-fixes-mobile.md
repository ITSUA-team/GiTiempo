# Mobile review-fix acceptance

Date: 2026-11-17. Branch `fix/537-complete-invoice-documents`, HEAD `ef7a83dd`, with uncommitted review fixes. Observed product diff SHA-256: `3d3b921a79d7a02f25cf5f492ca145b6eb77841cee54555450a4372463f5e112`, from `git diff HEAD -- apps packages | shasum -a 256`.

Environment: real SPA `http://127.0.0.1:5175`, compiled API `http://127.0.0.1:3001`, isolated local database `gitiempo_e2e_537_review`, Chromium viewport **390 × 844**. Authentication used the local test admin. API requests were real; no transport or component-state mocks were used. Only the mobile fixture created for this run was changed.

| Scenario | Result | Observed result / evidence |
| --- | --- | --- |
| Conditional required fields | PASS | Bank transfer exposed required beneficiary, bank and account with optional SWIFT. Card exposed required provider and HTTPS link while hiding the bank-only controls. The primary Save remained reachable in the viewport-constrained dialog. |
| Hidden Bank edits survive a real revision conflict | PASS | On INV-1, entered `Mobile local beneficiary`, `Mobile local account` and `MOBILEBIC`, then switched to Card and filled its provider/link. A concurrent real PATCH advanced revision 2 to 3. Save returned 409. Refresh latest revision adopted the saved notes while retaining Card edits. Switching back restored all three hidden Bank values. [Recovered fields](review-fixes-mobile-bank.png). Save succeeded; an independent GET confirmed revision 4 and the same beneficiary/account/SWIFT. |
| Field-errors-only PDF failure and correction | PASS | Blanked only the owned invoice's title directly in the verified isolated DB. The real PDF response was 422 `invoice_document_incomplete` with `missingFields: []` and `fieldErrors.title`. The page showed Title plus the server explanation and Edit billing information. [Rendered error](review-fixes-mobile-pdf.png). The action opened the editor; entering `Mobile repaired invoice` allowed Save and closed the dialog. |

Disposable mobile fixture: INV-1 `ca68495d-e5c5-4805-8c40-804eaf1ad31f`. No emails or messages were sent.

The initial browser session lost its connection during a long environment suspension/clock jump. All passing scenarios above were repeated in a fresh authenticated browser. Those interrupted attempts are not passing evidence.

The subsequent final source change removes deep traversal from the calculation watcher; the full admin suite checks its selection and refreshed-duration triggers. This report records the observed source fingerprint rather than claiming a later mobile rerun. Desktop follow-up for that optimization is recorded separately. The form hierarchy and payment markers remain aligned with the existing local design-source review; no new PrimeVue exception was introduced. Native Pencil pixel rendering remains unavailable as recorded in [design-parity.md](design-parity.md).

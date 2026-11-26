# Maintainability review fixes

Date: 2026-11-17. Branch `fix/537-complete-invoice-documents`, HEAD `ef7a83dd`, with uncommitted review fixes. Final product diff SHA-256: `a5ae79f56aa4c05db2f98b29de4e0551b2f97901595fbc321bed70389f780057`, computed with `git diff HEAD -- apps packages | shasum -a 256`. Evidence and OpenSpec documentation are excluded.

## Corrections

- Create validates the final reference-expanded document inside its transaction. A 5000-character template that grows beyond the limit now returns field-addressed 422 instead of committing an unreadable invoice. Unit and PostgreSQL E2E regressions cover rejection, invoice/link rollback and corrected retry. PostgreSQL sequence values can be skipped on failure; `design.md` and task 3.1 explicitly retain that allocator behavior.
- Revision reconciliation receives the full local payment snapshot. Write payloads still use only applicable payment fields. A conflict/refresh no longer discards hidden Bank beneficiary, account or SWIFT edits.
- Cached server errors track their real dependencies, including selected durations for amount overflow and both dates for date-order errors. Correcting and then undoing a field does not resurrect an old server error. Eligibility refresh also triggers authoritative recalculation. Error handling avoids deep traversal and uses Set membership for selected entries.
- PDF failures render field labels and messages even when legacy `missingFields` is empty. Legacy section-only responses retain their fallback.
- POST/PATCH OpenAPI 422 responses describe incomplete-document, logo and other billing DomainError envelopes. Regenerated OpenAPI changes were inspected for unrelated drift.
- `requiredInvoicePaymentDetails` is the shared method-specific rule used by validation and form required markers. Four component cases cover Bank, Card, Other and custom methods; existing shared schema cases retain independent contract coverage.
- Removed the correlated workspace timezone lookup and runtime null-date branches. Migration 0036 backfills Issue date and declares it NOT NULL. Existing historical migration E2E coverage retains timezone behavior; runtime tests now verify persisted dates.

## Verification

| Check | Result |
| --- | --- |
| Workspace test graph, `pnpm exec turbo run test --concurrency=1`, then CI-target tests | PASS: 11 Turbo tasks; shared 886, API 824, admin 1123, user 699, web-shared 312, web-config 18, extension 261 — **4123 package tests plus 5 CI-target tests**. |
| Isolated Docker API E2E, `COMPOSE_PROJECT_NAME=gitiempo-api-e2e-537-review pnpm api:e2e:docker` | PASS: **491 tests / 37 files**. The new regression used real PostgreSQL and verified transaction rollback. Containers and volumes were removed by the repository script. |
| OpenAPI export, `pnpm openapi:export` | PASS; regenerated invoice write error contracts. |
| Final lint / typecheck | PASS: `pnpm exec turbo run lint typecheck --concurrency=1`, 19 tasks. Existing unrelated warnings remain; no new lint errors. |
| Final admin build | PASS: `pnpm --filter admin-web build`; existing bundle-size warning remains. |
| Final admin tests | PASS: `pnpm --filter admin-web test --maxWorkers=1`, **1123 tests / 93 files** on the final source. The targeted conflict/exclusion regression also passed independently without changing its timeout. |
| OpenSpec strict validation | PASS: `enforce-complete-invoice-documents`. |
| Desktop acceptance | PASS: real revision conflict/recovery, field-errors-only PDF correction and same-rate retry after real amount overflow. [Report](review-fixes-desktop.md). |
| Mobile acceptance | PASS: conditional required fields, real revision conflict/recovery and field-errors-only PDF correction at 390 × 844. [Report](review-fixes-mobile.md). |
| Independent review | API/shared and frontend reviewers approved the corrections. Their performance follow-up removed deep error-watcher traversal and quadratic ID membership. |
| Whitespace check | PASS: `git diff --check`. |

The initial parallel workspace test attempt hit a PDF test timeout under concurrent work. A later run was interrupted by a long environment suspension, causing unrelated user-web worker-start failures. The successful serialized workspace run above supersedes both attempts. After the final traversal optimization, one admin test timed out during the default parallel run; it passed independently and the complete final admin run passed with one worker. No test timeout or repository concurrency setting was changed.

Runtime QA initially observed fingerprint `3d3b921a79d7a02f25cf5f492ca145b6eb77841cee54555450a4372463f5e112`. The final product-only difference removes deep traversal from the calculation watcher while retaining reference-based dependencies. A final-source desktop follow-up verified real selection-driven previews of USD 400.00 then zero and a successful Save. Reports identify their observed revisions and follow-up. Form layout, required fields, action hierarchy and the existing design-source parity checklist are unchanged. No new PrimeVue compromise was needed; native Pencil rendering remains the previously documented visual limit.

Cleanup completed: owned browser sessions and local servers were closed, the disposable `gitiempo_e2e_537_review` database was dropped, and protected temporary environment/authentication files were removed. Durable reports and screenshots remain in this directory. No new commit or PR was created for these fixes.

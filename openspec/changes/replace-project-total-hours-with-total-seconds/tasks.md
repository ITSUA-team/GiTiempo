## 1. Shared Contract And API

- [ ] 1.1 Replace `totalHours` with `totalSeconds` in the shared project response schema and exported TypeScript types.
- [ ] 1.2 Update project API service aggregation to return completed-entry totals in seconds without dividing by 3600.
- [ ] 1.3 Update API project response mapping so list, create, update, and detail responses expose `totalSeconds` and omit `totalHours`.
- [ ] 1.4 Update backend tests and fixtures that assert project response shapes or aggregate totals.

## 2. Frontend Consumers

- [ ] 2.1 Update admin Projects table state, display formatting, global search, and Hours filters to consume `totalSeconds`.
- [ ] 2.2 Update admin reports project filtering that depends on tracked project totals to consume `totalSeconds`.
- [ ] 2.3 Update user-web/admin-web fixtures and mocks that use the shared project response shape.

## 3. Docs And Generated Contracts

- [ ] 3.1 Regenerate `packages/shared/openapi.json` after the shared contract and API response shape are updated.
- [ ] 3.2 Confirm `docs/API-ENDPOINTS.md` documents `totalSeconds` as seconds and no longer documents `totalHours` for project responses.

## 4. Verification

- [ ] 4.1 Run targeted shared-contract and API tests for project response totals.
- [ ] 4.2 Run targeted admin-web tests for project table filtering and reports project filtering.
- [ ] 4.3 Run typecheck or the smallest available package-level checks covering `@gitiempo/shared`, `@gitiempo/api`, `admin-web`, and `user-web`.
- [ ] 4.4 Search production code and docs for remaining `totalHours` references outside archived OpenSpec history and intentionally out-of-scope summary fields.

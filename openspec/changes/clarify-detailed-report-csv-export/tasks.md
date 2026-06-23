## 1. Backend Contract

- [ ] 1.1 Confirm `GET /reports/time/export` builds CSV from detailed project-task-user aggregate rows while preserving the same filters, sorting parameters, date defaults, and authorization scope as `GET /reports/time`.
- [ ] 1.2 Update report service tests so `groupBy=project` CSV export can emit multiple detailed rows for one project when task or user context differs.
- [ ] 1.3 Keep member-forbidden and PM-scope export coverage aligned with the detailed CSV row contract.

## 2. Documentation And UI Alignment

- [ ] 2.1 Update public API docs to describe detailed CSV row granularity and shared filter/scope behavior for `/reports/time/export`.
- [ ] 2.2 Update Admin Reports UI docs to state that `Export CSV` downloads backend-generated detailed project-task-user rows for the current setup controls.
- [ ] 2.3 Confirm Admin Reports client/view behavior still sends setup controls to the backend export endpoint and does not apply table-only search or column filters to CSV export scope.

## 3. Verification

- [ ] 3.1 Run `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test` for backend export changes.
- [ ] 3.2 Run relevant admin-web checks if Admin Reports client or view code changes.
- [ ] 3.3 Run `pnpm exec openspec validate clarify-detailed-report-csv-export --strict --no-interactive`.
- [ ] 3.4 Run `git diff --check`.

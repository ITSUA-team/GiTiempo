## Why

The reports CSV export contract currently says `/reports/time/export` uses the same grouping as `GET /reports/time`, but the branch exports detailed project-task-user aggregate rows for every `groupBy` value. Documenting this as an explicit contract avoids future agents "fixing" the implementation back to grouped JSON parity or adding tests that conflict with the intended export shape.

## What Changes

- Define `/reports/time/export` as a detailed CSV export endpoint that uses the same filters, sorting parameters, and authorization scope as `GET /reports/time`.
- Define CSV row granularity as project-task-user aggregate rows, regardless of selected `groupBy`.
- Preserve selected `groupBy` as CSV metadata rather than using it to collapse CSV row granularity.
- Update Admin Reports page expectations so `Export CSV` downloads backend-generated detailed rows while table search and column filters remain table-only.
- **BREAKING** for consumers that expected one CSV row per JSON report group.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reports-api`: Change CSV export requirements from grouped JSON parity to detailed project-task-user aggregate rows using the same filters, sorting parameters, and scope rules.
- `admin-pages`: Clarify that the Admin Reports page exports backend-generated detailed CSV rows for the selected setup controls.

## Impact

- API behavior/docs for `GET /reports/time/export`.
- Report export service tests that lock CSV row granularity.
- Admin Reports UI docs around CSV export scope and row detail.
- Public endpoint documentation for report CSV export.

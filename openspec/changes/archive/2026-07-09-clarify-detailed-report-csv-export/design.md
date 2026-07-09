## Context

`GET /reports/time` returns JSON rows grouped by the requested `groupBy` value: project, task, or user. The current report export implementation on this branch generates CSV from detailed aggregate rows grouped by project, task, and user so every exported row retains full project, task, and member context.

The active `reports-api` spec still describes CSV export as using the same grouping as JSON reports. That wording makes the implementation look like a contract regression even though the detailed CSV shape is the desired export behavior.

## Goals / Non-Goals

**Goals:**

- Make the CSV export contract explicit before active specs are synchronized.
- Preserve shared filter, date, search, sort, and PM scope behavior between JSON reports and CSV export.
- Define CSV row granularity as detailed project-task-user aggregates for every selected `groupBy` value.
- Keep Admin Reports page export behavior aligned with the backend endpoint contract.

**Non-Goals:**

- Do not change `GET /reports/time` JSON grouping behavior.
- Do not add a second detailed export endpoint.
- Do not change PM visibility rules or report filtering contracts.
- Do not introduce a new CSV dependency or streaming export path.

## Decisions

1. Treat CSV export as the detailed report surface.

   The CSV endpoint will keep accepting the same setup controls as JSON reports, but exported rows remain at project-task-user granularity. This provides the spreadsheet context users need without requiring a separate raw time-entry export.

   Alternative considered: keep CSV grouped exactly like JSON. Rejected because `groupBy=project` collapses task and member context, which makes exports less useful for audit and billing review.

2. Keep `groupBy` in the export query as metadata and setup parity.

   The Admin Reports page already sends current setup controls to the export endpoint. Keeping `groupBy` accepted avoids frontend branching, preserves filename/query parity, and lets the CSV identify the selected report setup without using it to collapse detailed rows.

   Alternative considered: remove `groupBy` from export. Rejected because it would split the shared setup contract and require unnecessary UI/client changes.

3. Update docs and tests with the contract change.

   Backend tests should assert detailed project-task-user CSV rows and PM scope behavior. Public endpoint and Admin Reports docs should state that export scope follows setup controls while row granularity stays detailed.

   Alternative considered: rely only on implementation tests. Rejected because the active OpenSpec mismatch caused review confusion and would recur after future refactors.

## Risks / Trade-offs

- [Risk] Existing CSV consumers may expect one row per JSON report group. -> Mitigation: mark the proposal as contract-changing and document detailed row granularity before synchronizing active specs.
- [Risk] `groupBy` being metadata rather than row grouping could be confusing. -> Mitigation: document that filters, sort parameters, and scope match JSON reports, while CSV row granularity is always project-task-user.
- [Risk] Future agents may reintroduce grouped export parity. -> Mitigation: add delta specs and tests that explicitly cover `groupBy=project` exporting multiple detailed rows when task or user context differs.

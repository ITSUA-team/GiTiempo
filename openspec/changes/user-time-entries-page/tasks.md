## 1. Contract And API Support

- [ ] 1.1 Add optional `taskId` to `updateTimeEntrySchema` in `packages/shared/src/contracts/time-entries.ts` and include it in the at-least-one-field validation.
- [ ] 1.2 Update shared contract tests or add focused schema coverage for update payloads with `taskId`, invalid task IDs, and unknown fields.
- [ ] 1.3 Update `TimeEntriesService.updateOwnEntry()` to validate a changed task through the existing visible/active task checks before updating `timeEntries.taskId`.
- [ ] 1.4 Add API service/controller tests proving completed entries can move to a visible active task and cannot move to invisible or inactive work.
- [ ] 1.5 Regenerate `packages/shared/openapi.json` so `UpdateTimeEntryDto` exposes optional `taskId`.

## 2. User-Web Client And State Model

- [ ] 2.1 Extend `apps/user-web/src/services/time-entries-client.spec.ts` coverage for `updateEntry()` with `taskId` and list query combinations used by the page.
- [ ] 2.2 Build a focused Time Entries page state/composable module for loading entries, visible projects, project tasks, filters, pagination, grouping, dialog state, and mutation feedback.
- [ ] 2.3 Ensure the state model keeps loading, empty, request-error, validation-error, and mutation-error states distinct.
- [ ] 2.4 Ensure create, edit, and delete successes refresh the server-backed list while preserving active filters and pagination where appropriate.

## 3. Time Entry Dialog UI

- [ ] 3.1 Implement the shared page-owned PrimeVue time-entry dialog for create and edit modes with the approved field order and mode-specific copy.
- [ ] 3.2 Wire project Select and task AutoComplete so suggestions are visible tasks, narrowed by selected project when available, and saved payloads submit selected `taskId`.
- [ ] 3.3 Support header-level create without preset day and day-level create with the selected day prefilled.
- [ ] 3.4 Keep edit failures retryable by preserving pending dialog values and rendering field/helper errors where applicable.
- [ ] 3.5 Add focused dialog tests for create payload mapping, edit prefill, project/task reassignment, validation failures, and retryable API failures.

## 4. Time Entries Page UI

- [ ] 4.1 Replace `TimeEntriesView.vue` placeholder with the approved page header, filter bar, grouped day sections, rows, and paginator using PrimeVue components and token utilities.
- [ ] 4.2 Render task-title search through backend `search`, selected task filtering through `taskId`, and date/project filters through the shared list query.
- [ ] 4.3 Render running entries highlighted with `bg-accent-tint`, live `HH:MM:SS` duration, and no edit/delete mutation path before stop.
- [ ] 4.4 Add the standard PrimeVue ConfirmDialog delete flow with success/error toast feedback and list refresh.
- [ ] 4.5 Render loading, empty, and request-error states as distinct page states without collapsing failed requests into empty data.
- [ ] 4.6 Review desktop UI parity against `GITiempo.pen` frames `Time Entries` and `Time Entry Dialog`, documenting any PrimeVue-only compromises.

## 5. Page Tests And Verification

- [ ] 5.1 Add view/composable tests for initial load, filter changes, pagination, grouped rendering, loading, empty, and request-error states.
- [ ] 5.2 Add interaction tests for header create, day create, edit save, edit failure, delete confirm success, and delete failure.
- [ ] 5.3 Run `pnpm --filter @gitiempo/shared build` if needed before API validation commands that depend on shared contracts.
- [ ] 5.4 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- [ ] 5.5 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [ ] 5.6 Run the applicable OpenAPI export workflow and verify `packages/shared/openapi.json` is committed with the contract changes.

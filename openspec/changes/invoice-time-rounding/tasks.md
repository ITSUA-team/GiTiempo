# Tasks

## 1. Database Migration (API)

- [x] 1.1 Add `time_rounding_step_minutes` NOT NULL integer column with default 1 and CHECK constraint (1–60) to the `workspace_settings` Drizzle schema in `apps/api/src/workspaces/schemas/workspace-settings.schema.ts`. Verify: `pnpm typecheck --filter @gitiempo/api` passes.
- [x] 1.2 Add `time_rounding_step_minutes` nullable integer column with CHECK constraint (1–60 or null) to the `projects` Drizzle schema in `apps/api/src/projects/schemas/projects.schema.ts`. Null means inherit from workspace. Verify: schema compiles.
- [x] 1.3 Add `rounding_step_minutes` NOT NULL integer column with default 1 and CHECK constraint (1–60) to the `invoices` Drizzle schema in `apps/api/src/invoices/schemas/invoices.schema.ts`. Verify: schema compiles and `invoiceRowSelection` includes the new column.
- [x] 1.4 Generate the Drizzle migration (`pnpm --filter @gitiempo/api dlx drizzle-kit generate`) and verify the migration SQL: `workspace_settings.time_rounding_step_minutes` defaults to 1 for existing rows; `projects.time_rounding_step_minutes` defaults to null for existing rows; `invoices.rounding_step_minutes` defaults to 1 for existing rows. Verify: migration file exists and SQL is additive only.

## 2. Shared Contracts (packages/shared)

- [x] 2.1 Extend workspace settings response schema with non-null `timeRoundingStepMinutes` (integer 1–60). Extend workspace settings update schema with optional `timeRoundingStepMinutes` (integer 1–60). Verify: schema rejects 0, non-integers, and values > 60.
- [x] 2.2 Extend `createInvoiceSchema` in `packages/shared/src/contracts/invoices.ts` with optional `roundingStepMinutes` (positive integer 1–60, null not accepted). Verify: schema rejects 0, non-integers, values > 60, and null.
- [x] 2.3 Extend `invoiceResponseSchema` with non-null `roundingStepMinutes` (integer 1–60). Verify: typecheck passes for `@gitiempo/shared`.
- [x] 2.4 Extend `eligibleEntriesResponseSchema` with non-null `defaultRoundingStepMinutes` (integer 1–60). Extend `eligibleEntriesQuerySchema` (or equivalent query contract) with optional `roundingStepMinutes` (integer 1–60). Verify: schema validates both fields.
- [x] 2.5 Extend `createProjectSchema` and `updateProjectSchema` in `packages/shared/src/contracts/projects.ts` with optional nullable `timeRoundingStepMinutes` (integer 1–60 or null, null = inherit). Extend `projectResponseSchema` and `projectDetailResponseSchema` with nullable `timeRoundingStepMinutes`. Verify: `pnpm typecheck --filter @gitiempo/shared` passes.
- [x] 2.6 Run `pnpm typecheck --filter @gitiempo/shared` and `pnpm lint --filter @gitiempo/shared` to verify the shared package is clean.

## 3. Backend Workspace Settings Service (API)

- [x] 3.1 Update `workspace-settings.service.ts` (or equivalent) to accept and store `timeRoundingStepMinutes` in the update method. Verify: `PATCH /workspace/settings` with `timeRoundingStepMinutes: 5` persists the value.
- [x] 3.2 Update workspace settings response mapping to include `timeRoundingStepMinutes` (non-null). Verify: `GET /workspace/settings` response includes the field.
- [x] 3.3 Add or update tests for workspace settings update with `timeRoundingStepMinutes` and invalid value rejection. Verify: `pnpm test --filter @gitiempo/api` passes.

## 4. Backend Invoice Service (API)

- [x] 4.1 Add a `roundEntrySeconds(durationSeconds, stepMinutes)` helper in `apps/api/src/invoices/services/invoices.service.ts` that returns `Math.ceil(durationSeconds / (stepMinutes * 60)) * (stepMinutes * 60)`. Since step is always 1–60, rounding is always applied. Verify: unit test covers 60s→300s (step 5), 300s→300s (step 5), 90s→300s (step 5), 60s→60s (step 1).
- [x] 4.2 Update `createInvoice` to resolve the snapshot `roundingStepMinutes`: use the request body value if supplied, else the scoped project's effective step (`project.timeRoundingStepMinutes ?? workspaceSettings.timeRoundingStepMinutes`), else the workspace setting for workspace-wide invoices. Store it (always non-null) on the invoice row. Verify: test covers project-explicit, project-inherit, and workspace-default cases.
- [x] 4.3 Update `createInvoice` total computation: apply `roundEntrySeconds` per eligible entry before summing, then pass the rounded total to `computeInvoiceTotals`. Verify: test confirms two 60s entries with step 5 produce 600s total and correct `totalHours`/`totalAmount`; original entry durations are unchanged.
- [x] 4.4 Update `previewEligibleEntries` to accept an optional `roundingStepMinutes` query param, apply per-entry rounding with it (or the effective project step when omitted), and include `defaultRoundingStepMinutes` (always non-null: project effective step or workspace setting) in the response. Verify: test covers explicit override, project-explicit, project-inherit, and workspace-wide cases.
- [x] 4.5 Update invoice response mapping (`getInvoice`, list endpoint) to include `roundingStepMinutes` from the invoice row. Verify: `GET /invoices/:id` response includes the snapshot field.
- [x] 4.6 Add or update e2e/integration tests in `apps/api/test/` for: invoice creation with per-entry rounding, effective-step resolution (project-explicit, project-inherit, workspace-wide), explicit override, preview with rounding, and invalid step rejection. Verify: `pnpm test --filter @gitiempo/api` passes.

## 5. Backend Project Service (API)

- [x] 5.1 Update `projects.service.ts` create method to accept `timeRoundingStepMinutes` (nullable, defaults to null = inherit). Verify: test confirms the stored value is returned in the project response; null is stored when omitted.
- [x] 5.2 Update `projects.service.ts` update method to accept and store `timeRoundingStepMinutes` (including setting to null for inherit). Verify: test confirms update, null-set (inherit), and invalid value rejection.
- [x] 5.3 Update project response mapping (list, detail) to include `timeRoundingStepMinutes` (nullable) from the project row. Verify: `GET /projects` and `GET /projects/:id` responses include the field.
- [x] 5.4 Add or update tests in `apps/api/test/` for project create/update with `timeRoundingStepMinutes`. Verify: `pnpm test --filter @gitiempo/api` passes.

## 6. OpenAPI Export (API)

- [x] 6.1 Run `pnpm openapi:export` and verify the generated spec includes `timeRoundingStepMinutes` on workspace settings response/update, `roundingStepMinutes` on invoice create/response, `defaultRoundingStepMinutes` on eligible-entries response, `roundingStepMinutes` on eligible-entries query, and `timeRoundingStepMinutes` on project create/update/response schemas. Verify: diff shows only the expected new fields.

## 7. Shared Frontend Form Schema (packages/web-shared)

- [x] 7.1 Extend `projectEditFormSchema` in `packages/web-shared/src/validation/project-forms.ts` with an optional nullable `timeRoundingStepMinutes` field (integer 1–60 or null, null = inherit). Update the `ProjectEditFormInput` type. Verify: `pnpm typecheck --filter @gitiempo/web-shared` passes.

## 8. .pen Design Frames

- [x] 8.1 Verify the Admin Projects frame in `GITiempo.pen` has the `roundingStepWrap` Select in the `projectSettings` (`UD9Ym`) inline settings row, placed after `billableSelectWrap` and before `archiveProjectButton`. Shows "Inherit from workspace (1 min)" as default. Verify: frame renders the new control matching existing settings row styling.
- [x] 8.2 Verify the Add Project frame in `GITiempo.pen` (`uIbaa`) has the `Time rounding step` field after the billable field, following the existing `projectDialogField` / `projectInput` pattern. Shows "Inherit from workspace (1 min)" as default. Verify: frame renders the new field matching existing form layout.
- [x] 8.3 Verify the Admin Settings frame in `GITiempo.pen` (`XtiC1` / `settingsForm`) has the `roundingStepField` in the `workspaceSection` after `rateField`, matching existing field styling. Shows "1 min" as current value. Verify: frame renders the new field in the workspace settings card.

## 9. UI Documentation (docs/ui/pages-admin.md)

- [x] 9.1 Update the project settings row description (around L113) to include `Time rounding step` as a PrimeVue `<Select>` with "Inherit from workspace (N min)" as the first option, then 1, 5, 10, 15, 30, 60. Verify: docs text matches the updated .pen frame.
- [x] 9.2 Update the Add Project form description (around L114) to include `Time rounding step` alongside `Default billable for new tasks`, defaulting to "Inherit from workspace". Verify: docs text matches the updated .pen frame.
- [x] 9.3 Update the invoice create dialog fields list (around L67) to add `Rounding step (PrimeVue <Select> with presets: 1, 5, 10, 15, 30, 60; pre-filled from the eligible-entries preview `defaultRoundingStepMinutes` which sources the project's effective rounding step; dynamically updates when the project selection changes; overridable per-invoice without changing project settings; uses the same touched-flag pattern as rate and currency)`. Verify: docs text covers pre-fill, dynamic project change, override, and touched-flag behavior.
- [x] 9.4 Update the workspace settings card description in the admin Settings section to include `Time rounding step (minutes)` as an active editable PrimeVue `<Select>` (presets: 1, 5, 10, 15, 30, 60, default 1) near the Default hourly rate / Currency row, saved via `PATCH /workspace/settings`. Verify: docs text matches the updated .pen frame and the implementation contract.

## 10. Admin Workspace Settings UI (admin-web)

- [x] 10.1 Add a `Time rounding step (minutes)` PrimeVue `<Select>` to the admin Settings page workspace settings card, with options: 1, 5, 10, 15, 30, 60. Initialize from `workspaceSettings.timeRoundingStepMinutes` (default 1). Place it near the Default hourly rate / Currency row, matching the updated .pen frame. Verify: component renders the control and binds to the settings form.
- [x] 10.2 Update the workspace settings save flow to include `timeRoundingStepMinutes` in the `PATCH /workspace/settings` payload. Verify: save persists the field and the form refreshes from the authoritative response.
- [x] 10.3 Add or update component tests for the Settings page covering rounding step initialization, change, and save. Verify: `pnpm test --filter admin-web` passes for the settings tests.

## 11. Admin Project Settings UI (admin-web)

- [x] 11.1 Add a `Time rounding step` PrimeVue `<Select>` to `ProjectEditForm.vue` (the inline settings form on the Projects list page) with options: "Inherit from workspace (N min)" (value = null, N = current workspace default), 1, 5, 10, 15, 30, 60. Initialize from the project's `timeRoundingStepMinutes` (null shows "Inherit"). Place it after the billable default control and before the archive button, matching the updated .pen frame. Verify: component renders the control and binds to the form schema.
- [x] 11.2 Update `useProjectEditActions.ts` to pass `timeRoundingStepMinutes` into the `client.updateProject` payload alongside `defaultBillableForTasks` and `visibility`. Verify: save emits the field (including null for inherit) in the PATCH request.
- [x] 11.3 Add the same `Time rounding step` Select to the Add Project form (`/projects/new`), defaulting to "Inherit from workspace" (null), matching the updated .pen frame. Verify: create request includes the field.
- [x] 11.4 Add or update component tests for `ProjectEditForm.vue` covering rounding step initialization, inherit selection (null), explicit value selection, save, and clearing back to inherit. Verify: `pnpm test --filter admin-web` passes for the project form tests.
- [x] 11.5 Final design parity review: compare the implemented Projects list inline settings row and Add Project form against the updated .pen frames (`UD9Ym` and `uIbaa`). Verify: any remaining deltas are explicitly identified and documented.

## 12. Admin Invoice Create Dialog UI (admin-web)

- [x] 12.1 Add `roundingStepMinutes` ref (non-null integer, default 1) and `roundingStepTouched` flag to `InvoiceCreateDialog.vue` state, mirroring the existing `rateTouched`/`currencyTouched` pattern. Verify: state is reactive and resets on dialog close.
- [x] 12.2 Add a rounding step field to the dialog template (PrimeVue `<Select>` with presets: 1, 5, 10, 15, 30, 60) near the rate/currency/discount row. Verify: field renders and is bound to the ref.
- [x] 12.3 Add a preview sync watcher that pre-fills `roundingStepMinutes` from `preview.defaultRoundingStepMinutes` (always non-null) only while `!roundingStepTouched`. When the user changes the project selection, the new preview response provides the new project's effective step, which pre-fills the field (unless touched). Verify: test confirms pre-fill, dynamic project-change update, and that user edits are not overwritten.
- [x] 12.4 Include `roundingStepMinutes` in the preview query params (when the user has touched the field) so the preview updates when the step changes. Verify: changing the step triggers a re-fetch with the new value.
- [x] 12.5 Include `roundingStepMinutes` in the create request payload in `handleCreate`. Update `admin-invoices-client.ts` `createInvoice` to pass the field. Verify: create request body includes the field.
- [x] 12.6 Add or update component tests for `InvoiceCreateDialog.vue` covering: pre-fill from preview, dynamic update on project change, user override preserving value, preview re-fetch on step change, and create payload inclusion. Verify: `pnpm test --filter admin-web` passes for the dialog tests.

## 13. Manual Testing

- [ ] 13.1 Open Admin Panel → Settings, change `Time rounding step` to 5, save, and reload. Verify: the Select shows 5 after reload.
- [ ] 13.2 Open Admin Panel → Projects, expand a project's inline settings row. Verify: the `Time rounding step` Select shows "Inherit from workspace (5 min)" by default. Change it to 10, save, and reload. Verify: the Select shows 10 after reload.
- [ ] 13.3 Change the same project's `Time rounding step` back to "Inherit from workspace", save, and reload. Verify: the Select shows "Inherit from workspace (5 min)" after reload.
- [ ] 13.4 Open the Add Project page. Verify: the `Time rounding step` Select defaults to "Inherit from workspace (5 min)". Create a project with the default. Expand its settings. Verify: it shows "Inherit from workspace (5 min)".
- [ ] 13.5 Change the workspace `Time rounding step` from 5 to 15 in Settings. Go back to the project from step 13.4 (which was set to inherit). Expand its settings. Verify: the Select now shows "Inherit from workspace (15 min)".
- [ ] 13.6 Create a project with `Time rounding step: 5` and add several short completed billable time entries (e.g. two entries of 1 min each). Open the invoice create dialog, select the project and date range, and wait for the preview. Verify: the `Rounding step` field auto-fills with 5 and the previewed total hours show 10 min (0.17h), not 2 min.
- [ ] 13.7 In the same create dialog, change `Rounding step` from 5 to 15. Verify: the preview re-fetches and the total hours update to reflect 15-min rounding per entry (e.g. two 1-min entries → 30 min).
- [ ] 13.8 In the same create dialog, change the project selection to a different project with `Time rounding step: 1`. Verify: the `Rounding step` field dynamically updates to 1 and the preview re-fetches with 1-min rounding.
- [ ] 13.9 Create the invoice with `Rounding step: 5`. Open the invoice detail page. Verify: the detail page shows the rounded total hours but does NOT display the rounding step value anywhere.
- [ ] 13.10 After creating the invoice, go back to the project settings and change `Time rounding step` to 15. Reopen the invoice detail page. Verify: the invoice total hours remain unchanged (snapshot).
- [ ] 13.11 Create a workspace-wide invoice (no project). Verify: the `Rounding step` field defaults to the workspace setting (e.g. 15) and the total hours reflect that rounding.
- [ ] 13.12 Attempt to create a project with `timeRoundingStepMinutes: 0` or `61` via API (e.g. Bruno). Verify: the request is rejected with a validation error.
- [ ] 13.13 Attempt to create an invoice with `roundingStepMinutes: 0` via API. Verify: the request is rejected with a validation error.
- [ ] 13.14 Attempt to update an existing invoice's `roundingStepMinutes` via `PATCH /invoices/:id`. Verify: the request is rejected (snapshot field is not mutable).
- [ ] 13.15 Verify original time entries are not modified: after creating an invoice with rounding step 5, check the time entries linked to that invoice via the API or DB. Verify: their `durationSeconds` values remain the original raw values, not the rounded ones.

## 14. Integration Verification

- [x] 14.1 Run `pnpm typecheck` across the monorepo and confirm no new errors. Verify: command exits 0.
- [x] 14.2 Run `pnpm lint` across the monorepo and confirm no new errors. Verify: command exits 0.
- [x] 14.3 Run `pnpm test` across the monorepo and confirm all tests pass. Verify: command exits 0.
- [x] 14.4 Run `pnpm test:e2e` and confirm invoice creation, project settings, and workspace settings e2e tests pass with the new rounding fields. Verify: command exits 0 or only pre-existing failures remain.
- [x] 14.5 Run `openspec validate --strict` for this change and confirm it passes. Verify: command exits 0.
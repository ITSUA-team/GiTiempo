# Tasks

## 1. Database Migration (API)

- [ ] 1.1 Add `time_rounding_step_minutes` nullable integer column with CHECK constraint (1–60 or null) to the `projects` Drizzle schema in `apps/api/src/projects/schemas/projects.schema.ts`. Verify: `pnpm typecheck --filter @gitiempo/api` passes.
- [ ] 1.2 Add `rounding_step_minutes` nullable integer column with CHECK constraint (1–60 or null) to the `invoices` Drizzle schema in `apps/api/src/invoices/schemas/invoices.schema.ts`. Verify: schema compiles and `invoiceRowSelection` includes the new column.
- [ ] 1.3 Generate the Drizzle migration (`pnpm --filter @gitiempo/api dlx drizzle-kit generate`) and verify the migration SQL adds both columns as nullable with defaults of null for existing rows. Verify: migration file exists and SQL is additive only.

## 2. Shared Contracts (packages/shared)

- [ ] 2.1 Extend `createInvoiceSchema` in `packages/shared/src/contracts/invoices.ts` with optional `roundingStepMinutes` (positive integer 1–60). Verify: schema rejects 0, non-integers, and values > 60; accepts valid values and omission.
- [ ] 2.2 Extend `invoiceResponseSchema` with nullable `roundingStepMinutes` (integer or null). Verify: typecheck passes for `@gitiempo/shared`.
- [ ] 2.3 Extend `eligibleEntriesResponseSchema` with nullable `defaultRoundingStepMinutes`. Extend `eligibleEntriesQuerySchema` (or equivalent query contract) with optional `roundingStepMinutes` (integer 1–60). Verify: schema validates both fields.
- [ ] 2.4 Extend `createProjectSchema` and `updateProjectSchema` in `packages/shared/src/contracts/projects.ts` with optional nullable `timeRoundingStepMinutes` (integer 1–60 or null). Extend `projectResponseSchema` and `projectDetailResponseSchema` with nullable `timeRoundingStepMinutes`. Verify: `pnpm typecheck --filter @gitiempo/shared` passes.
- [ ] 2.5 Run `pnpm typecheck --filter @gitiempo/shared` and `pnpm lint --filter @gitiempo/shared` to verify the shared package is clean.

## 3. Backend Invoice Service (API)

- [ ] 3.1 Add a `roundEntrySeconds(durationSeconds, stepMinutes)` helper in `apps/api/src/invoices/services/invoices.service.ts` that returns `Math.ceil(durationSeconds / (stepMinutes * 60)) * (stepMinutes * 60)` when step is non-null, else `durationSeconds`. Verify: unit test covers 60s→300s (step 5), 300s→300s (step 5), 90s→300s (step 5), and null step passthrough.
- [ ] 3.2 Update `createInvoice` to resolve the snapshot `roundingStepMinutes`: use the request body value if supplied, else the scoped project's `timeRoundingStepMinutes`, else null. Store it on the invoice row. Verify: test covers project-default, explicit-override, and null-fallback cases.
- [ ] 3.3 Update `createInvoice` total computation: apply `roundEntrySeconds` per eligible entry before summing, then pass the rounded total to `computeInvoiceTotals`. Verify: test confirms two 60s entries with step 5 produce 600s total and correct `totalHours`/`totalAmount`; original entry durations are unchanged.
- [ ] 3.4 Update `previewEligibleEntries` to accept an optional `roundingStepMinutes` query param, apply per-entry rounding with it (or the project default when omitted and non-null), and include `defaultRoundingStepMinutes` (from the scoped project or null) in the response. Verify: test covers explicit override, project default, and null cases.
- [ ] 3.5 Update invoice response mapping (`getInvoice`, list endpoint) to include `roundingStepMinutes` from the invoice row. Verify: `GET /invoices/:id` response includes the snapshot field.
- [ ] 3.6 Add or update e2e/integration tests in `apps/api/test/` for: invoice creation with per-entry rounding, default-from-project resolution, explicit override, null step, preview with rounding, and invalid step rejection. Verify: `pnpm test --filter @gitiempo/api` passes.

## 4. Backend Project Service (API)

- [ ] 4.1 Update `projects.service.ts` create method to accept and store `timeRoundingStepMinutes` from the validated request. Verify: test confirms the stored value is returned in the project response.
- [ ] 4.2 Update `projects.service.ts` update method to accept and store `timeRoundingStepMinutes` (including clearing to null). Verify: test confirms update and null-clear work.
- [ ] 4.3 Update project response mapping (list, detail) to include `timeRoundingStepMinutes` from the project row. Verify: `GET /projects` and `GET /projects/:id` responses include the field.
- [ ] 4.4 Add or update tests in `apps/api/test/` for project create/update with `timeRoundingStepMinutes` and invalid value rejection. Verify: `pnpm test --filter @gitiempo/api` passes.

## 5. OpenAPI Export (API)

- [ ] 5.1 Run `pnpm openapi:export` and verify the generated spec includes `roundingStepMinutes` on the invoice create request, invoice response, eligible-entries query, eligible-entries response, and `timeRoundingStepMinutes` on project create/update/response schemas. Verify: diff shows only the expected new fields.

## 6. Shared Frontend Form Schema (packages/web-shared)

- [ ] 6.1 Extend `projectEditFormSchema` in `packages/web-shared/src/validation/project-forms.ts` with an optional nullable `timeRoundingStepMinutes` field (integer 1–60 or null). Update the `ProjectEditFormInput` type. Verify: `pnpm typecheck --filter @gitiempo/web-shared` passes.

## 7. .pen Design Frames

- [ ] 7.1 Update the Admin Projects frame in `GITiempo.pen`: add a `Time rounding step (minutes)` PrimeVue-style Select to the `projectSettings` (`UD9Ym`) inline settings row on the projects list, placed after `billableSelectWrap` and before `archiveProjectButton`. Options: No rounding, 1, 5, 10, 15, 30, 60. Match the existing settings row layout, spacing, and token styling. Verify: frame renders the new control in the settings row alongside members autocomplete, visibility select, and billable default.
- [ ] 7.2 Update the Add Project frame in `GITiempo.pen` (`P7tkrI` / `uIbaa` "Add Project — Unified Form"): add a `Time rounding step (minutes)` Select to the form, defaulting to No rounding, following the existing `projectDialogField` / `projectInput` pattern used by the other Add Project fields. Verify: frame renders the new field in the form following the established field layout.

## 8. UI Documentation (docs/ui/pages-admin.md)

- [ ] 8.1 Update the project settings row description (around L113) to include `Time rounding step (minutes)` as a PrimeVue `<Select>` with presets (No rounding, 1, 5, 10, 15, 30, 60) alongside the existing `New task billable default` control. Verify: docs text matches the updated .pen frame and the implementation contract.
- [ ] 8.2 Update the Add Project form description (around L114) to include `Time rounding step (minutes)` alongside `Default billable for new tasks`. Verify: docs text matches the updated .pen frame.
- [ ] 8.3 Update the invoice create dialog fields list (around L67) to add `Rounding step (optional — PrimeVue <Select> with presets: No rounding, 1, 5, 10, 15, 30, 60; pre-filled from the eligible-entries preview `defaultRoundingStepMinutes` which sources the project's `timeRoundingStepMinutes`; overridable per-invoice without changing project settings; uses the same touched-flag pattern as rate and currency)`. Verify: docs text covers pre-fill, override, and touched-flag behavior.
- [ ] 8.4 Update the invoice detail page section (after L75) to include the snapshot `roundingStepMinutes` in the detail summary (e.g. "Rounding step: 5 min" or "Rounding step: None"), sourced from the invoice response, not the project's current setting. Verify: docs text describes the display as a read-only snapshot field.

## 9. Admin Project Settings UI (admin-web)

- [ ] 9.1 Add a `Time rounding step (minutes)` PrimeVue `<Select>` to `ProjectEditForm.vue` (the inline settings form on the Projects list page) with options: No rounding (null), 1, 5, 10, 15, 30, 60. Initialize from the project's `timeRoundingStepMinutes`. Place it after the billable default control and before the archive button, matching the updated .pen frame. Verify: component renders the control and binds to the form schema.
- [ ] 9.2 Update `useProjectEditActions.ts` to pass `timeRoundingStepMinutes` into the `client.updateProject` payload alongside `defaultBillableForTasks` and `visibility`. Verify: save emits the field in the PATCH request.
- [ ] 9.3 Add the same `Time rounding step (minutes)` Select to the Add Project form (`/projects/new`), defaulting to No rounding (null), matching the updated .pen frame. Verify: create request includes the field.
- [ ] 9.4 Add or update component tests for `ProjectEditForm.vue` covering rounding step initialization, change, save, and null clearing. Verify: `pnpm test --filter admin-web` passes for the project form tests.
- [ ] 9.5 Final design parity review: compare the implemented Projects list inline settings row and Add Project form against the updated .pen frames (`UD9Ym` and `uIbaa`). Verify: any remaining deltas are explicitly identified and documented.

## 10. Admin Invoice Create Dialog UI (admin-web)

- [ ] 10.1 Add `roundingStepMinutes` ref (nullable) and `roundingStepTouched` flag to `InvoiceCreateDialog.vue` state, mirroring the existing `rateTouched`/`currencyTouched` pattern. Verify: state is reactive and resets on dialog close.
- [ ] 10.2 Add a rounding step field to the dialog template (PrimeVue `<Select>` with presets: No rounding, 1, 5, 10, 15, 30, 60) near the rate/currency/discount row. Verify: field renders and is bound to the ref.
- [ ] 10.3 Add a preview sync watcher that pre-fills `roundingStepMinutes` from `preview.defaultRoundingStepMinutes` only while `!roundingStepTouched`. Verify: test confirms pre-fill and that user edits are not overwritten.
- [ ] 10.4 Include `roundingStepMinutes` in the preview query params (when non-null or when user has touched the field) so the preview updates when the step changes. Verify: changing the step triggers a re-fetch with the new value.
- [ ] 10.5 Include `roundingStepMinutes` in the create request payload in `handleCreate`. Update `admin-invoices-client.ts` `createInvoice` to pass the field. Verify: create request body includes the field.
- [ ] 10.6 Add or update component tests for `InvoiceCreateDialog.vue` covering: pre-fill from preview, user override preserving value, preview re-fetch on step change, and create payload inclusion. Verify: `pnpm test --filter admin-web` passes for the dialog tests.

## 11. Admin Invoice Detail UI (admin-web)

- [ ] 11.1 Display the snapshot `roundingStepMinutes` in the invoice detail summary in `InvoiceDetailView.vue` (e.g. "Rounding step: 5 min" or "Rounding step: None"). Verify: detail page shows the snapshot value, not the project's current setting.
- [ ] 11.2 Add or update component tests for the detail view confirming the rounding step display. Verify: `pnpm test --filter admin-web` passes for the detail test.

## 12. Integration Verification

- [ ] 12.1 Run `pnpm typecheck` across the monorepo and confirm no new errors. Verify: command exits 0.
- [ ] 12.2 Run `pnpm lint` across the monorepo and confirm no new errors. Verify: command exits 0.
- [ ] 12.3 Run `pnpm test` across the monorepo and confirm all tests pass. Verify: command exits 0.
- [ ] 12.4 Run `pnpm test:e2e` and confirm invoice creation and project settings e2e tests pass with the new rounding fields. Verify: command exits 0 or only pre-existing failures remain.
- [ ] 12.5 Run `openspec validate --strict` for this change and confirm it passes. Verify: command exits 0.
# Design

## Context

See proposal.md for motivation. The invoice backend (`apps/api/src/invoices/`) and admin UI (`apps/admin-web/src/`) are complete from the `add-admin-invoices-ui` change. The current invoice totals computation sums raw time-entry durations and rounds only at the aggregate centihour level (`secondsToCentihours` at `invoices.service.ts` L896–898, `computeInvoiceTotals` at L914–938). No rounding-step column exists on `projects`, `invoices`, or `workspace_settings`. Project billing settings currently consist of `defaultBillableForTasks` on the `projects` table, edited through `ProjectEditForm.vue` (inline row expansion) with the shared form schema in `packages/web-shared/src/validation/project-forms.ts`. The invoice create dialog (`InvoiceCreateDialog.vue`) pre-fills rate and currency from the `eligibleEntriesResponseSchema` response using a touched-flag pattern.

The `admin-invoices-page` capability is being introduced by `add-admin-invoices-ui` (not yet archived). This change adds complementary requirements to the same capability.

## Goals / Non-Goals

**Goals:**

- Add a per-project `timeRoundingStepMinutes` billing setting editable in the admin project settings form.
- Add a per-invoice `roundingStepMinutes` snapshot, auto-populated from the project at creation, overridable in the create dialog.
- Apply per-entry ceiling rounding (up to the nearest step multiple in seconds) before summing, without modifying original time-entry records.
- Surface the rounding step in the eligible-entries preview so the dialog pre-fills and live-updates correctly.
- Display the snapshot rounding step on the invoice detail page.

**Non-Goals:**

- No workspace-level default rounding step (the setting is project-scoped only; workspace-wide invoices default to no rounding).
- No rounding step values outside 1–60 minutes.
- No changes to the centihour-to-hours precision (`numeric(10,2)` totalHours) — per-entry rounding produces rounded seconds which feed into the existing `secondsToCentihours` → `computeInvoiceTotals` pipeline.
- No changes to invoice update, delete, or status-transition behavior beyond the snapshot immutability declaration.
- No `user-web` surfaces for the rounding step.
- No PDF or email integration for the rounding step.

## Decisions

### 1. Rounding step stored as nullable integer minutes, not seconds

Store `time_rounding_step_minutes` on `projects` and `rounding_step_minutes` on `invoices` as nullable `integer` columns. The value represents minutes (1–60) or null (no rounding). The backend converts to seconds (`step * 60`) for the per-entry rounding computation.

**Rationale:** The user-facing concept is "minutes" ("крок округлення часу у хвилинах"). Storing minutes keeps the DB column and API contract intuitive. The seconds conversion is an internal computation detail. Nullable (rather than 0) clearly distinguishes "no rounding configured" from "round to 0 minutes" (which would be invalid).

**Alternative:** Store seconds — rejected because it leaks the internal unit into the contract and UI.

### 2. Per-entry rounding computed in the service layer, not in SQL

In `InvoicesService.createInvoice` and `previewEligibleEntries`, after selecting eligible entries, compute `roundedSeconds` per entry in TypeScript: `Math.ceil(entry.durationSeconds / (stepSeconds)) * stepSeconds` when `step` is non-null, else `entry.durationSeconds`. Sum the rounded values and pass the total to the existing `computeInvoiceTotals`.

**Rationale:** The eligibility query already selects entries with `FOR UPDATE` and returns them to the service layer for linking. The per-entry rounding is a pure arithmetic transform on the already-fetched durations. Moving it to SQL would require a more complex query without benefit, and the existing `secondsToCentihours` conversion already happens in TypeScript.

**Alternative:** SQL `ceil(duration / step) * step` — rejected to keep the rounding logic co-located with the existing TypeScript computation.

### 3. Invoice rounding step is a snapshot, immutable after creation

The `roundingStepMinutes` field follows the same snapshot convention as `hourlyRate`, `currency`, `totalHours`, and `totalAmount`. It is set at creation time and never updated. The `updateInvoiceSchema` already rejects unknown fields (`.strict()`), so `roundingStepMinutes` is automatically excluded from update requests.

**Rationale:** Changing the rounding step after creation would require recomputing totals, which the existing spec explicitly forbids ("Update does not recompute totals"). Keeping it immutable preserves the snapshot integrity and the audit trail.

### 4. Preview endpoint accepts optional `roundingStepMinutes` query param

The `GET /invoices/eligible-entries` endpoint gains an optional `roundingStepMinutes` query parameter. When omitted, the preview uses the scoped project's `timeRoundingStepMinutes` (if non-null) and returns it as `defaultRoundingStepMinutes`. When supplied, the preview applies that step and still returns the project's default in `defaultRoundingStepMinutes`.

**Rationale:** The create dialog needs to (a) pre-fill from the project default, and (b) live-update the preview when the user overrides the step. A single query parameter supports both flows. The `defaultRoundingStepMinutes` in the response enables the touched-flag pre-fill pattern (same as rate/currency).

### 5. Create dialog uses the existing touched-flag pattern for pre-fill

Add a `roundingStepMinutes` ref and a `roundingStepTouched` flag to `InvoiceCreateDialog.vue`, mirroring the existing `rateTouched` / `currencyTouched` pattern. The preview sync watcher pre-fills `roundingStepMinutes` from `preview.defaultRoundingStepMinutes` only while `!roundingStepTouched`. The preview query includes `roundingStepMinutes` when the user has set a value, triggering a re-fetch when the step changes.

**Rationale:** This is the established pattern in the dialog (L119–156). Reusing it ensures user edits are never overwritten by fresh preview responses and keeps the implementation consistent.

### 6. Project settings form: rounding step as a Select with presets

Add a `Time rounding step (minutes)` PrimeVue `<Select>` to `ProjectEditForm.vue` with options: No rounding (null), 1, 5, 10, 15, 30, 60. The shared form schema `projectEditFormSchema` gains an optional nullable integer field. The save flow in `useProjectEditActions.ts` passes `timeRoundingStepMinutes` into the `updateProject` payload alongside `defaultBillableForTasks` and `visibility`.

**Rationale:** A fixed preset list covers all practical billing increments and prevents invalid free-text entry. The Select control is consistent with the existing `Visibility` Select in the same form. The docs (`pages-admin.md` L113) describe the project settings row as a single line — the new control is added to that line.

**Alternative:** InputNumber with min/max validation — rejected because a preset Select is simpler and covers the practical range without validation edge cases.

### 7. Add Project form also includes the rounding step

The Add Project page (`/projects/new`) gains the same `Time rounding step (minutes)` Select, defaulting to No rounding (null). The `createProjectSchema` already accepts the new optional field.

**Rationale:** Consistent with the `Default billable for new tasks` precedent — both project creation and project settings expose the same billing metadata.

### 8. Invoice detail page displays the snapshot rounding step

Add a read-only "Rounding step" field to the invoice detail summary in `InvoiceDetailView.vue`, showing the snapshot value (e.g. "5 min" or "None"). This is display-only, sourced from the invoice response's `roundingStepMinutes`.

**Rationale:** The detail page already displays snapshot rate, currency, totals, and discount. The rounding step is part of the same snapshot and should be visible for audit purposes.

## Risks / Trade-offs

- **Centihour precision loss for small steps:** With a 5-minute step, one 5-min entry = 300 sec → `secondsToCentihours(300)` = `Math.round(8.33)` = 8 centihours = 0.08h, not 0.0833h. This is the existing 2-decimal `totalHours` precision limitation, not introduced by this change. → Mitigation: document in the spec that the centihour conversion is unchanged; a future change could increase `totalHours` precision if needed.
- **Dual creation of `admin-invoices-page` capability:** Both `add-admin-invoices-ui` and this change introduce `admin-invoices-page` as a new capability with `ADDED Requirements`. → Mitigation: when archiving, archive `add-admin-invoices-ui` first so the main spec exists; then this change's `ADDED Requirements` merge into the existing spec. Requirement names do not overlap.
- **Migration on existing invoices:** Existing invoice rows receive `rounding_step_minutes: null`, meaning their totals are unchanged (raw-sum behavior). → No risk to existing data.

## Migration Plan

1. **Drizzle migration:** Add `time_rounding_step_minutes` (nullable integer, CHECK 1–60 or null) to `projects`; add `rounding_step_minutes` (nullable integer, CHECK 1–60 or null) to `invoices`. Both default to null for existing rows.
2. **Shared contracts:** Extend Zod schemas in `packages/shared/src/contracts/invoices.ts` and `projects.ts`.
3. **Backend service:** Update `InvoicesService.createInvoice` and `previewEligibleEntries` with per-entry rounding logic; update `projects.service.ts` create/update to pass through the new field.
4. **OpenAPI export:** Re-run `pnpm openapi:export` to regenerate the spec with the new fields.
5. **Frontend forms:** Update `ProjectEditForm.vue`, the Add Project form, `InvoiceCreateDialog.vue`, and `InvoiceDetailView.vue`.
6. **Rollback:** The migration is additive (nullable columns). Rolling back drops the columns; no data loss in existing rows since the columns are nullable and defaulted.

## Open Questions

None. All material decisions are resolved. The 1–60 minute range, nullable-for-no-rounding semantics, and project-scoped default (no workspace-level default) are recorded as assumptions in the proposal.
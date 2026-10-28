# Design

## Context

See proposal.md for motivation. The invoice backend (`apps/api/src/invoices/`) and admin UI (`apps/admin-web/src/`) are complete from the `add-admin-invoices-ui` change. The current invoice totals computation sums raw time-entry durations and rounds only at the aggregate centihour level (`secondsToCentihours` at `invoices.service.ts` L896–898, `computeInvoiceTotals` at L914–938). No rounding-step column exists on `workspace_settings`, `projects`, or `invoices`. Project billing settings currently consist of `defaultBillableForTasks` on the `projects` table, edited through `ProjectEditForm.vue` (inline row expansion) with the shared form schema in `packages/web-shared/src/validation/project-forms.ts`. The invoice create dialog (`InvoiceCreateDialog.vue`) pre-fills rate and currency from the `eligibleEntriesResponseSchema` response using a touched-flag pattern. Workspace settings (`workspace_settings` table) currently store `currency`, `defaultHourlyRate`, and `timeZone`, edited through the admin Settings page.

The `admin-invoices-page` capability is being introduced by `add-admin-invoices-ui` (not yet archived). This change adds complementary requirements to the same capability.

## Goals / Non-Goals

**Goals:**

- Add a workspace-level `timeRoundingStepMinutes` setting (default 1, always active) editable in admin Settings.
- Add a per-project `timeRoundingStepMinutes` that inherits from the workspace when null, overridable per-project in the admin project settings form and Add Project form.
- Add a per-invoice `roundingStepMinutes` snapshot (always non-null), auto-populated from the effective project step at creation, overridable in the create dialog.
- Apply per-entry ceiling rounding (up to the nearest step multiple in seconds) before summing, without modifying original time-entry records. Rounding is always active — minimum step is 1 minute.
- Surface the effective rounding step in the eligible-entries preview so the dialog pre-fills and live-updates correctly, including dynamic update when the project selection changes.
- Expose the rounded per-entry duration (`roundedDurationSeconds`) in the invoice detail and eligible-entries preview responses, and render it in the admin invoice detail time-entries table and the create dialog preview Duration column, so users see the rounded billed duration per entry.
- Update .pen design frames for the project settings, Add Project, admin Settings, and Create Invoice dialog surfaces.

**Non-Goals:**

- No "no rounding" option — rounding is always active with a minimum step of 1 minute.
- No display of the rounding step *value* on the invoice detail page — only the rounded `totalHours` result and the rounded per-entry durations (via `roundedDurationSeconds`) are visible to users; the step integer itself is not rendered.
- No rounding step values outside 1–60 minutes.
- No changes to the centihour-to-hours precision (`numeric(10,2)` totalHours) — per-entry rounding produces rounded seconds which feed into the existing `secondsToCentihours` → `computeInvoiceTotals` pipeline.
- No changes to invoice update, delete, or status-transition behavior beyond the snapshot immutability declaration.
- No `user-web` surfaces for the rounding step.
- No PDF or email integration for the rounding step.

## Decisions

### 1. Three-level rounding step hierarchy: workspace → project → invoice

The rounding step follows a three-level inheritance chain:

1. **Workspace settings** (`workspace_settings.timeRoundingStepMinutes`): NOT NULL, default 1. The workspace-wide default. Edited in admin Settings.
2. **Project** (`projects.timeRoundingStepMinutes`): NULLABLE. When null, the project inherits the workspace value. When set (1–60), the project uses its own value. The effective project step = `project.timeRoundingStepMinutes ?? workspaceSettings.timeRoundingStepMinutes`.
3. **Invoice** (`invoices.roundingStepMinutes`): NOT NULL, always a positive integer. Snapshot at creation time, resolved from: request body → effective project step → workspace setting. Immutable after creation.

**Rationale:** The user wants workspace-level defaults that projects can inherit, with per-project and per-invoice overrides. This three-level chain is the minimal model that supports all three override points. Projects default to null (inherit) so changing the workspace default automatically propagates to all projects that haven't been explicitly overridden. The invoice snapshot is always non-null because rounding is always active.

**Alternative:** Store the workspace value on each project at creation time (snapshot) — rejected because changing the workspace default would not propagate to existing projects, defeating the purpose of a workspace-level default.

### 2. Rounding step stored as integer minutes, always 1–60

All three columns store integer minutes (1–60). The backend converts to seconds (`step * 60`) for the per-entry rounding computation. The workspace and invoice columns are NOT NULL (always active); the project column is nullable (null = inherit).

**Rationale:** The user-facing concept is "minutes" ("крок округлення часу у хвилинах"). Storing minutes keeps the DB column and API contract intuitive. The seconds conversion is an internal computation detail. Rounding is always active — there is no "no rounding" state — so the workspace and invoice columns are NOT NULL with a default of 1.

### 3. Per-entry rounding computed in the service layer, not in SQL

In `InvoicesService.createInvoice` and `previewEligibleEntries`, after selecting eligible entries, compute `roundedSeconds` per entry in TypeScript: `Math.ceil(entry.durationSeconds / (stepSeconds)) * stepSeconds`. Sum the rounded values and pass the total to the existing `computeInvoiceTotals`. The same per-entry rounded value is attached to each entry summary as `roundedDurationSeconds` in both the invoice detail response (computed with the invoice's `roundingStepMinutes` snapshot) and the eligible-entries preview response (computed with the effective step), so the UI can render the rounded billed duration per entry without recomputing it. `computeInvoiceTotals` rounds the resulting amount UP to the next whole cent (ceiling) using BigInt fixed-point arithmetic (`+ 999_999n` before floor division by `1_000_000n`), so any fractional cent is always billed and never truncated (e.g. 3.3333 -> 3.34). Since the step is always at least 1, every entry is always rounded (1-minute step means rounding up to the nearest 60 seconds).

**Rationale:** The eligibility query already selects entries with `FOR UPDATE` and returns them to the service layer for linking. The per-entry rounding is a pure arithmetic transform on the already-fetched durations. Moving it to SQL would require a more complex query without benefit.

### 4. Invoice snapshot is always non-null, immutable after creation

The `roundingStepMinutes` field follows the same snapshot convention as `hourlyRate`, `currency`, `totalHours`, and `totalAmount`. It is set at creation time (always a positive integer) and never updated. The `updateInvoiceSchema` already rejects unknown fields (`.strict()`), so `roundingStepMinutes` is automatically excluded from update requests.

**Rationale:** Changing the rounding step after creation would require recomputing totals, which the existing spec explicitly forbids. Since rounding is always active, the snapshot is never null.

### 5. Preview endpoint returns always-non-null `defaultRoundingStepMinutes`

The `GET /invoices/eligible-entries` endpoint gains an optional `roundingStepMinutes` query parameter. When omitted, the preview uses the scoped project's effective rounding step (project value or workspace default) and returns it as `defaultRoundingStepMinutes`. For workspace-wide previews (no project), it returns the workspace's `timeRoundingStepMinutes`. When supplied, the preview applies that step and still returns the effective default in `defaultRoundingStepMinutes`.

**Rationale:** The create dialog needs to (a) pre-fill from the project/workspace default, and (b) live-update the preview when the user overrides the step. Since rounding is always active, the default is never null.

### 6. Create dialog dynamically updates rounding step when project changes

When the user selects or changes the project in the create dialog, the preview request is re-triggered (it already re-fetches on project change). The preview response includes `defaultRoundingStepMinutes` (the new project's effective step), and the dialog pre-fills the rounding step field with this value — unless the user has manually touched the field (`roundingStepTouched` flag), in which case the user's value is preserved.

**Rationale:** The user wants the rounding step to "inherit from the project" dynamically. Since the dialog already re-fetches the preview when the project changes, the `defaultRoundingStepMinutes` in the new response naturally provides the new project's effective step. The touched-flag pattern (same as rate/currency) ensures user overrides are respected.

In addition to the preview-based update, the dialog now updates the rounding step field **immediately** when the project selection changes, using the project's own `timeRoundingStepMinutes` value passed via the `projects` prop — without waiting for the preview response. When the project's value is null (inherit), the dialog falls back to `workspaceRoundingStepMinutes` (passed as a new prop from workspace settings). The preview sync watcher still runs afterwards and reconciles any discrepancy. This requires the dialog to receive `timeRoundingStepMinutes` per project and a `workspaceRoundingStepMinutes` value as new props from the parent view (`InvoicesView.vue`).

### 7. Project settings Select: "Inherit from workspace" as first option

The project settings form and Add Project form show a PrimeVue `<Select>` with "Inherit from workspace (N min)" as the first option (where N is the current workspace default), followed by explicit values 1, 5, 10, 15, 30, 60. Selecting "Inherit" stores `null` on the project. Selecting an explicit value stores that integer.

**Rationale:** The user wants projects to inherit from the workspace by default. The "Inherit from workspace (N min)" label makes the inheritance explicit and shows the current effective value, so the user understands what will happen without checking the workspace settings separately.

### 8. Admin Settings page: workspace rounding step Select

The admin Settings page gains a `Time rounding step (minutes)` PrimeVue `<Select>` in the workspace settings card, near the Default hourly rate / Currency row. Options: 1, 5, 10, 15, 30, 60. Default 1. Saved through `PATCH /workspace/settings`.

**Rationale:** The workspace settings card already has editable billing-related fields (rate, currency, time zone). The rounding step is a billing setting that belongs there. A Select with presets is simpler and more consistent than a free-text input.

### 9. Invoice detail displays rounded per-entry durations but not the rounding step value

The invoice detail page shows `totalHours` (the rounded aggregate) and, in the time-entries table, the rounded per-entry duration via `roundedDurationSeconds`. It does NOT show the `roundingStepMinutes` value. The rounding step is an internal computation parameter, not user-facing invoice metadata, but the rounded duration per entry IS user-facing because it explains how each tracked unit was billed.

**Rationale:** The user wants to see the rounded billed time per task, not just an opaque aggregate. Returning `roundedDurationSeconds` (computed server-side with the invoice snapshot step) keeps the client free of rounding logic and consistent with the totals computation. The raw `durationSeconds` is retained in the payload for transparency and auditability but is not the rendered value. The step integer itself remains hidden because it is a parameter, not a billing outcome.

**Alternative:** Display the raw per-entry duration and let users infer rounding from the aggregate — rejected because it obscures per-task billing and makes short entries (e.g. 6 seconds billed as 5 minutes) look like data errors.

### 10. .pen design: four frames updated with responsive-aware controls

Four .pen frames are updated:
- **Admin Projects inline settings** (`UD9Ym`): `roundingStepWrap` Select added to the `settingsRow` after the billable default, before the archive button. Shows "Inherit from workspace (1 min)" as default.
- **Add Project form** (`uIbaa`): `projectDialogField` for "Time rounding step" added after the billable field, following the existing form field pattern.
- **Admin Settings form** (`XtiC1`): `roundingStepField` added to the `workspaceSection` after the rate field, matching the existing field styling.
- **Create Invoice dialog** (`field3` row in the invoice create frame): the "Total amount (calculated)" display field is replaced with a "Rounding step" Select (label "Rounding step", value "1 min", chevron-down icon). All three fields in the row (Currency, Discount, Rounding step) change from fixed width 150 to `fill_container` for equal distribution on desktop, matching the `sm:flex-1` implementation.

No mobile variants exist for these frames in the current .pen. The controls follow the existing desktop patterns and will be implemented responsively in code using the established admin-web responsive patterns (PrimeVue Select adapts to mobile automatically).

**Rationale:** The .pen frames are the parity checklist for implementation. Adding the controls now ensures the implementation has an approved visual reference. The controls match existing styling patterns for consistency.

## Risks / Trade-offs

- **Centihour precision loss for small steps:** With a 1-minute step, one 60s entry = 60 sec -> `secondsToCentihours(60)` = `Math.round(1.67)` = 2 centihours = 0.02h. The true value is 0.0167h. This is the existing 2-decimal `totalHours` precision limitation, not introduced by this change. -> Mitigation: document in the spec that the centihour conversion is unchanged; a future change could increase `totalHours` precision if needed.
- **Amount ceiling vs half-up:** The amount is always rounded UP to the next cent (ceiling), not half-up, so a sub-cent fraction like $3.3333 bills as $3.34. This favors the billing side on every fractional cent. -> Mitigation: this is the intended billing behavior (round up); the spec documents the ceiling mode explicitly, and the create dialog estimate mirrors the same fixed-point ceiling so the preview matches the authoritative invoice total.
- **Settings row width in project settings:** The inline settings row already contains members autocomplete, visibility, billable, archive, cancel, save. Adding the rounding step Select makes the row tight at 1100px. → Mitigation: the members autocomplete is `fill_container` and will shrink; if it becomes too tight, the implementation can move action buttons to a second row or shorten the "Inherit from workspace" label.
- **Workspace default change propagation:** Changing the workspace default affects all projects with null `timeRoundingStepMinutes`. This is intentional (inheritance) but could surprise users who expect project settings to be frozen. → Mitigation: the "Inherit from workspace (N min)" label in the project Select makes the dynamic relationship explicit.
- **Dual creation of `admin-invoices-page` capability:** Both `add-admin-invoices-ui` and this change introduce `admin-invoices-page` as a new capability. → Mitigation: when archiving, archive `add-admin-invoices-ui` first so the main spec exists; then this change's `ADDED Requirements` merge into the existing spec. Requirement names do not overlap.
- **Migration on existing data:** Existing `workspace_settings` rows receive `time_rounding_step_minutes: 1`; existing `projects` rows receive `time_rounding_step_minutes: null` (inherit); existing `invoices` rows receive `rounding_step_minutes: 1`. Invoice totals are not recomputed (snapshot values remain as originally captured). → No risk to existing invoice data; existing projects will start inheriting the workspace default of 1 minute.

## Migration Plan

1. **Drizzle migration:** Add `time_rounding_step_minutes` (NOT NULL integer, default 1, CHECK 1–60) to `workspace_settings`; add `time_rounding_step_minutes` (nullable integer, CHECK 1–60 or null) to `projects` with backfill null; add `rounding_step_minutes` (NOT NULL integer, default 1, CHECK 1–60) to `invoices` with backfill 1.
2. **Shared contracts:** Extend Zod schemas in `packages/shared/src/contracts/invoices.ts`, `projects.ts`, and workspace settings contracts. Add `roundedDurationSeconds` to `invoiceTimeEntrySummarySchema`.
3. **Backend service:** Update `InvoicesService.createInvoice` and `previewEligibleEntries` with per-entry rounding logic and effective step resolution; attach `roundedDurationSeconds` to entry summaries in `toInvoiceResponse` and the preview response; update `projects.service.ts` and `workspace-settings.service.ts` create/update to pass through the new field.
4. **OpenAPI export:** Re-run `pnpm openapi:export` to regenerate the spec with the new fields.
5. **Frontend forms:** Update admin Settings page, `ProjectEditForm.vue`, Add Project form, `InvoiceCreateDialog.vue`. Render `roundedDurationSeconds` in `InvoiceDetailView.vue` time-entries Duration column and `InvoiceCreateDialog.vue` eligible-entries preview Duration column.
6. **Rollback:** The migration is additive (nullable or defaulted columns). Rolling back drops the columns; no data loss in existing rows since the columns are nullable or defaulted.

## Open Questions

None. All material decisions are resolved. The 1–60 minute range, always-active rounding (no "no rounding"), workspace-level default with project inheritance, and non-display of the rounding step on invoice detail are all settled.
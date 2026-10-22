# Proposal

## Why

Invoices currently sum raw time-entry durations and round only at the aggregate centihour level. Workspaces that bill in rounded increments (e.g. 5-minute blocks) have no way to configure that behavior, so every second is billed as-is. This makes invoices inconsistent with common billing practices where each tracked unit is rounded up to a configurable step, ensuring fair and predictable billing.

## What Changes

- Add a non-null `timeRoundingStepMinutes` field to workspace settings (default 1 minute, valid values 1–60), configurable in Admin Panel → Settings. Rounding is always active — there is no "no rounding" option.
- Add a nullable `timeRoundingStepMinutes` field to projects. When null, the project inherits the workspace's `timeRoundingStepMinutes`. When set to a specific value (1–60), the project uses its own rounding step. Configurable in Admin Panel → Projects → project settings (inline edit form) and the Add Project form. The Select shows "Inherit from workspace (N min)" as the first option, followed by explicit values 1, 5, 10, 15, 30, 60.
- Add a non-null `roundingStepMinutes` snapshot field to invoices. It is auto-populated at creation time from the effective project rounding step (project value or inherited workspace value), or from the workspace setting for workspace-wide invoices. It is overridable per-invoice in the create dialog. The snapshot is always a positive integer (1–60) — never null.
- Invoice creation applies per-entry ceiling rounding: each eligible time entry's duration is rounded up to the nearest multiple of the step (in seconds), then the rounded durations are summed to compute invoice totals. Original time-entry records are not modified.
- The eligible-entries preview endpoint applies the same per-entry rounding and returns the effective `defaultRoundingStepMinutes` (always non-null) so the create dialog can pre-fill it. When the user changes the selected project in the dialog, the rounding step dynamically updates to the new project's effective value.
- The invoice create dialog gains a rounding-step field (PrimeVue `<Select>` with presets: 1, 5, 10, 15, 30, 60), pre-filled from the preview response, with the same touched-flag pattern used for hourly rate and currency. The field is included in the create request payload.
- The invoice `roundingStepMinutes` is a snapshot: it is immutable after creation and not editable via the update endpoint, consistent with the existing rate/currency/totals immutability convention.
- The invoice detail page does NOT display the rounding step value. Only the rounded `totalHours` result is shown — the rounding step itself is an internal computation parameter, not user-facing invoice metadata.
- Shared Zod contracts for workspace settings, invoice create/response/preview, and project create/update/response are extended with the new fields.
- Database migrations add `time_rounding_step_minutes` to `workspace_settings` (NOT NULL, default 1, CHECK 1–60), `time_rounding_step_minutes` to `projects` (nullable, CHECK 1–60 or null), and `rounding_step_minutes` to `invoices` (NOT NULL, default 1, CHECK 1–60).

## Capabilities

### New Capabilities

- `admin-invoices-page`: Rounding step field behavior in the admin invoice create dialog — dynamic pre-fill from the project's effective rounding step via the preview response, per-invoice override without affecting project settings. Complementary to the base invoice UI introduced by `add-admin-invoices-ui`.

### Modified Capabilities

- `invoices-api`: Invoice creation and preview apply per-entry ceiling rounding using a per-invoice rounding step; the create request accepts `roundingStepMinutes`; the preview response returns the effective `defaultRoundingStepMinutes`; the invoice response includes the snapshot `roundingStepMinutes`.
- `project-management`: Projects store an optional `timeRoundingStepMinutes` that inherits from the workspace default when null; editable by admins and PMs through project create/update.
- `data-model`: `workspace_settings` table gains `time_rounding_step_minutes` (NOT NULL, default 1); `projects` table gains `time_rounding_step_minutes` (nullable, null = inherit); `invoices` table gains `rounding_step_minutes` (NOT NULL, default 1, snapshot).
- `contracts`: Shared Zod schemas for workspace settings, invoice create/response/preview, and project create/update/response are extended with the rounding-step fields.
- `admin-projects-page`: The inline project edit form and Add Project form expose a time-rounding-step Select with "Inherit from workspace" as the default option.
- `admin-settings-page`: The workspace settings card gains an editable `Time rounding step (minutes)` Select (presets: 1, 5, 10, 15, 30, 60), saved through `PATCH /workspace/settings`.

## Impact

- **Backend (apps/api)**: New Drizzle migration (3 tables); `InvoicesService.createInvoice` and `previewEligibleEntries` apply per-entry rounding and resolve the effective step from project or workspace; `projects.service.ts` and `workspace-settings.service.ts` create/update handle the new field; OpenAPI export changes.
- **Shared (packages/shared)**: Zod contract extensions for workspace settings, invoices, and projects.
- **Shared frontend (packages/web-shared)**: `projectEditFormSchema` extended with the rounding-step field.
- **Admin frontend (apps/admin-web)**: `ProjectEditForm.vue` gains a rounding-step Select with "Inherit" option; Add Project form gains the same; `InvoiceCreateDialog.vue` gains a rounding-step field with dynamic project-based pre-fill; admin Settings page gains a workspace-level rounding-step Select; `admin-invoices-client.ts` and workspace settings client pass the new field.
- **.pen design**: `GITiempo.pen` updated — Admin Projects inline settings (`UD9Ym`), Add Project form (`uIbaa`), and Admin Settings form (`XtiC1`) gain the new rounding-step Select controls, with responsive treatment matching existing patterns.
- **Affected layers**: backend, shared, admin-web (multiple).
- **Contracts modified**: yes — workspace settings, invoice, and project schemas change. No authentication behavior changes.
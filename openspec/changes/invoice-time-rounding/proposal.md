# Proposal

## Why

Invoices currently sum raw time-entry durations and round only at the aggregate centihour level. Workspaces that bill in rounded increments (e.g. 5-minute blocks) have no way to configure that behavior, so every second is billed as-is. This makes invoices inconsistent with common billing practices where each tracked unit is rounded up to a configurable step, ensuring fair and predictable billing.

## What Changes

- Add a nullable `timeRoundingStepMinutes` field to projects, configurable in Admin Panel → Projects → project settings (inline edit form). `null` means no rounding (current behavior). Valid values are positive integers 1–60.
- Add a nullable `roundingStepMinutes` snapshot field to invoices. It is auto-populated from the scoped project's `timeRoundingStepMinutes` at invoice creation time and is overridable per-invoice in the create dialog without changing the project setting. For workspace-wide invoices (no project scope), it defaults to `null` and is manually settable.
- Invoice creation applies per-entry ceiling rounding: each eligible time entry's duration is rounded up to the nearest multiple of the step (in seconds), then the rounded durations are summed to compute invoice totals. Original time-entry records are not modified. When the step is `null`, the current aggregate-sum behavior is preserved.
- The eligible-entries preview endpoint applies the same per-entry rounding and returns the project's default `roundingStepMinutes` so the create dialog can pre-fill it.
- The invoice create dialog gains a rounding-step field, pre-filled from the preview response (which sources it from the project), with the same touched-flag pattern used for hourly rate and currency. The field is included in the create request payload.
- The invoice `roundingStepMinutes` is a snapshot: it is immutable after creation and not editable via the update endpoint, consistent with the existing rate/currency/totals immutability convention.
- Shared Zod contracts (`createInvoiceSchema`, `invoiceResponseSchema`, `eligibleEntriesResponseSchema`, `createProjectSchema`, `updateProjectSchema`, `projectResponseSchema`) are extended with the new fields.
- A database migration adds the `time_rounding_step_minutes` column to `projects` and the `rounding_step_minutes` column to `invoices`, both nullable integers with a CHECK constraint (1–60 or null).

## Capabilities

### New Capabilities

- `admin-invoices-page`: Rounding step field behavior in the admin invoice create dialog — pre-fill from project default via the preview response, per-invoice override without affecting project settings. Complementary to the base invoice UI introduced by `add-admin-invoices-ui`.

### Modified Capabilities

- `invoices-api`: Invoice creation and preview apply per-entry ceiling rounding using a per-invoice rounding step; the create request accepts `roundingStepMinutes`; the preview response returns the project default `roundingStepMinutes`; the invoice response includes the snapshot `roundingStepMinutes`.
- `project-management`: Projects store an optional `timeRoundingStepMinutes` billing setting editable by admins and PMs through project updates.
- `data-model`: `projects` table gains `time_rounding_step_minutes` nullable integer column (CHECK 1–60 or null); `invoices` table gains `rounding_step_minutes` nullable integer snapshot column (CHECK 1–60 or null).
- `contracts`: Shared Zod schemas for invoice create/response/preview and project create/update/response are extended with the rounding-step fields.
- `admin-projects-page`: The inline project edit form exposes a time-rounding-step field alongside existing billing settings (visibility, billable default, members).

## Impact

- **Backend (apps/api)**: New Drizzle migration; `InvoicesService.createInvoice` and `previewEligibleEntries` apply per-entry rounding; `computeInvoiceTotals` receives rounded total seconds; `projects.service.ts` create/update handle the new field; invoice and project controllers pass through the new field; OpenAPI export changes.
- **Shared (packages/shared)**: Zod contract extensions for invoices and projects.
- **Shared frontend (packages/web-shared)**: `projectEditFormSchema` extended with the rounding-step field.
- **Admin frontend (apps/admin-web)**: `ProjectEditForm.vue` gains a rounding-step input; `InvoiceCreateDialog.vue` gains a rounding-step field with preview pre-fill; `admin-invoices-client.ts` passes the field in the create payload; invoice detail view displays the snapshot rounding step.
- **Affected layers**: backend, shared, admin-web (multiple).
- **Contracts modified**: yes — invoice and project create/response schemas change. No authentication behavior changes.
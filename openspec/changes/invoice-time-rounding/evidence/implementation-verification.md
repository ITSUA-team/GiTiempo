# Implementation Verification Evidence

## Environment

- OS: Linux
- Node: (not recorded for this change)
- Date: 2026-10-23
- Branch: feat/settings-time-rounding
- HEAD commit: 08417d5e

## Design Parity Review (Task 11.5)

Task 11.5 requires a final design parity review of the approved `.pen` frames against the implementation, with any remaining deltas explicitly identified. The review covered the three `.pen` frames referenced in tasks 8.1–8.3:

### Admin Projects inline settings (UD9Ym)

- `.pen` frame: `roundingStepWrap` Select in the `projectSettings` inline settings row, placed after `billableSelectWrap`, before `archiveProjectButton`.
- Implementation: `ProjectEditForm.vue` places the Time rounding step Select after the billable default control (L196–207) and before the archive/dialog footer actions (L233–259). The Select offers "Inherit from workspace (N min)" as the first option (value null) followed by the presets 1, 5, 10, 15, 30, 60.
- Delta: None. Placement matches the `.pen` frame description (verified via source inspection).

### Add Project form (uIbaa)

- `.pen` frame: "Time rounding step" field after the billable field, following the existing `projectDialogField` / `projectInput` pattern.
- Implementation: `AddProjectView.vue` places the Time rounding step field after the billable field (L559–583), using the same `projectDialogField` / `projectInput` pattern. Defaults to "Inherit from workspace" (null).
- Delta: None. Matches the `.pen` frame (verified via source inspection).

### Admin Settings form (XtiC1)

- `.pen` frame: `roundingStepField` in `workspaceSection` after `rateField`, matching the existing field styling. Shows "1 min" as current value.
- Implementation: `SettingsForm.vue` places the "Time rounding step (minutes)" Select immediately below the rate/currency row (L228–253), using the same PrimeVue Select + label + error message pattern as the other settings fields.
- Delta: None. Matches the `.pen` frame (verified via source inspection).

### Review method note

`.pen` frames are binary; internal element placement was verified indirectly through the `docs/ui/pages-admin.md` descriptions (which match the `.pen` task descriptions in tasks.md 8.1–8.3) and the implementation source code. No visual pixel-level comparison was performed.

## Out-of-scope findings

The branch contains one unrelated drive-by fix:

- `packages/shared/src/auth/profile-initials.ts` (+spec): changes initials logic to skip non-letter leading characters. Not part of the invoice-time-rounding change scope. Not tracked in tasks.md. Recommend separating this into its own commit/PR in future practice.

## Implementation coverage summary

What was verified during the review (via source inspection and review findings):

### Database migration (0024)

Additive only. Three columns added with correct nullability, defaults, and CHECK constraints. Snapshot chain consistent.

### Shared contracts

All Zod schemas extended with correct nullability and bounds (1–60). OpenAPI export regenerated with all 5 field locations.

### Backend services

- `roundEntrySeconds` helper with the exact formula.
- `createInvoice` resolves the snapshot with correct priority (request → project.effective → workspace).
- Per-entry rounding applied before summing; original entries unmodified.
- `previewEligibleEntries` accepts an optional override, returns `defaultRoundingStepMinutes` as the effective default (not the override).
- Invoice response mapping includes `roundingStepMinutes`.
- Project create/update accept the nullable field. Workspace settings update accepts the field.

### Admin frontend

- SettingsForm, ProjectEditForm, AddProjectView, and InvoiceCreateDialog all implement the rounding step Select with correct presets, touched-flag pattern, and pre-fill behavior.
- InvoiceDetailView does NOT display the rounding step.

### Tests

E2e coverage for:

- Invoice create with rounding: explicit, project-snapshot, inherit, workspace-wide, and override cases.
- Preview with project step.
- Invalid step rejection.
- Project CRUD with the field.
- Workspace settings update.

Contract-level boundary tests and a preview-override e2e test were added as follow-up, closing test-coverage gaps identified during review.

## Commands run and results

| Command | Result |
|---|---|
| `openspec validate invoice-time-rounding --strict` | ✓ Valid |
| (typecheck/lint/test) | To be run by orchestrator after test additions |
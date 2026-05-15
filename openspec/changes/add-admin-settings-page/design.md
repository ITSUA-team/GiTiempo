## Context

`apps/admin-web/src/views/SettingsView.vue` currently renders a shared placeholder page. The approved `GITiempo.pen` frame `h8YRz` (`Admin Settings`) shows the intended Settings visual treatment: authenticated admin shell, a `Settings` header with supporting copy, a white 620px settings card, grouped settings sections, 38px form controls, and a right-aligned `Cancel` plus primary `Save Settings` action row.

This rewritten change is explicitly admin-web only. The current API already supports workspace name via `/workspace` and workspace settings `currency` plus `defaultHourlyRate` via `/workspace/settings`. The design also shows invoice prefix, payment terms, legal entity, and tax ID; those fields may be rendered as inactive future controls for design parity, but they are not in the current API contract and must not be persisted because the user explicitly requested no API changes.

Required implementation references are `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, `docs/ui/patterns.md`, `apps/admin-web/AGENTS.md`, and `GITiempo.pen` frame `h8YRz`.

## Goals / Non-Goals

**Goals:**

- Replace the Settings placeholder with a functional admin-web page using PrimeVue controls and token-based Tailwind classes.
- Match the approved `h8YRz` visual language where compatible with the current API: shell state, header copy, card width, grouped sections, control sizing, spacing, radii, typography, separators, and bottom action alignment.
- Load current workspace identity and workspace settings using the existing endpoints.
- Use current workspace identity to define the authenticated admin shell workspace label instead of keeping the fallback `Workspace Admin` label.
- Render a page-level PrimeVue Skeleton that approximates the header, settings card, field rows, and action row while initial data is loading.
- Keep request-error state distinct from empty/default state and provide retry plus toast feedback.
- Save only changed current API fields and keep failed edits retryable.

**Non-Goals:**

- No changes to `apps/api`, `packages/shared`, database schema, migrations, seed data, or OpenAPI artifacts.
- No implementation of invoice prefix, payment terms, legal entity, or tax ID persistence.
- No API, shared contract, database, seed, migration, or OpenAPI changes for the inactive future fields.
- No new aggregate settings endpoint.
- No cross-app extraction unless an existing shared component already fits exactly.

## Decisions

1. Use existing API-supported settings only.

   The Settings page should load `/workspace` and `/workspace/settings`, then render and save workspace name, default hourly rate, and currency. Invoice prefix, payment terms, legal entity, and tax ID should be shown only as disabled inactive future controls. This keeps the implementation aligned with the user’s no-API-change constraint while restoring design parity.

   Alternative considered: render all `h8YRz` fields as editable UI and ignore unsupported values on save. Rejected because that would create misleading controls that appear persisted.

2. Keep route orchestration thin with admin-local leaves.

   `SettingsView.vue` should compose a settings composable, a form component, and a skeleton/error surface rather than owning all fetch/save/form markup directly. This follows the admin-web rule against route-level mixed orchestration and large presentational templates.

   Alternative considered: implement all behavior in `SettingsView.vue`. Rejected because loading, dirty-state, validation, cancel, and save failure transitions are easier to test in a composable and focused UI leaves.

3. Use PrimeVue controls and token-based Tailwind styling.

   Use `InputText` for workspace name, `InputNumber` for default hourly rate, `Select` for currency, `Button` for actions, `Message` or helper text for validation, and `Skeleton` for first load. Tailwind classes should use existing tokens such as `bg-surface`, `text-text-dark`, `text-text-muted`, `border-divider`, `shadow-card`, and `rounded-lg`.

   Alternative considered: custom div-based controls to mirror the `.pen` exactly. Rejected because project UI docs require PrimeVue equivalents for standard app UI.

4. Preserve design parity as a checklist, not an excuse to exceed scope.

   The page should match `h8YRz` for page header, 620px desktop card, grouped sections, field density, action hierarchy, and responsive adaptation. The known design parity exception is that Billing Defaults and Organization fields are inactive future controls instead of persisted editable settings.

   Alternative considered: changing API/contracts to match every visible design field. Rejected by explicit user instruction.

## Risks / Trade-offs

- Design field mismatch -> The approved design includes fields that the current API cannot persist. Mitigation: render those fields as disabled inactive future controls and submit only current API fields.
- Partial save across two endpoints -> Workspace name and settings updates use different endpoints. Mitigation: compute changed payloads separately, call only needed mutations, and keep edits retryable on failure.
- Request-error vs default data confusion -> A failed initial load could otherwise look like empty settings. Mitigation: keep a dedicated request-error surface with retry and toast feedback.
- Skeleton drift -> Skeletons can become visually unrelated to the final layout. Mitigation: build a settings-specific skeleton matching the header, card field rows, and action row.

## Migration Plan

- No migration is required because this change does not alter backend data or contracts.
- Rollback is limited to reverting admin-web Settings page files and documentation/spec updates.

## Open Questions

- None for this admin-web-only pass. Activating and persisting invoice prefix, payment terms, legal entity, and tax ID requires a separate API/contract/data-model change.

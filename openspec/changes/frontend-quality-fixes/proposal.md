## Why

`quality-review` of the current branch identified five categories of technical debt introduced during the admin-web screens and shared-component implementation sprints. The issues are small individually but compound over time: duplicated transport logic diverges silently, raw design tokens miss future theme updates, and a premature UI state reset creates a silent data-loss path for users saving project settings.

## What Changes

- Migrate `projects-client.ts`, `members-client.ts`, and `time-entries-client.ts` from the legacy `http-helpers.ts` helpers (`getJson`, `postJson`, `patchJson`, `deleteJson`) to the unified `requestJson` helper from `@gitiempo/web-shared/http`, then delete `http-helpers.ts`.
- Move the `formatHours` pure function from `apps/admin-web/src/components/projects/ProjectsTable.vue` and `apps/user-web/src/composables/useProjectFormatters.ts` into `packages/web-shared` as a shared export; update both call sites.
- Fix `ProjectsTable.vue` `saveSettings`: close the expanded inline-edit row only after the parent confirms a successful save (not synchronously before the async call completes).
- Replace raw hex colour values in `ProjectSourceCard.vue` with design-token Tailwind utilities (`text-text-dark`, `text-text-muted`, `border-brand`, `bg-brand`, `bg-app-bg`); keep `#F7F2FC` as a raw value because it has no token equivalent.
- Replace raw `<button>` elements in `AddProjectForm.vue` (Back, Create project), `ProjectsTable.vue` (Cancel, Save, Edit, Archive/Unarchive), and `AdminPageHeader.vue` (back-link) with PrimeVue `<Button>` to align with the documented UI convention.

## Capabilities

### New Capabilities

- `shared-format-hours`: Export `formatHours` as a shared pure-function utility from `packages/web-shared`, consumed by both SPAs.

### Modified Capabilities

- `components`: `AppFormField`, `AppInput`, `AppSelect` — no spec-level behavior change; but the shared component convention now explicitly covers `formatHours` extraction criteria.
- `frontend-shared-leaves`: Transport layer consolidation — `http-helpers.ts` is removed; all shared API clients use `requestJson`.

## Impact

- `packages/web-shared/src/api/`: `projects-client.ts`, `members-client.ts`, `time-entries-client.ts` — import change, no behavioral change.
- `packages/web-shared/src/api/http-helpers.ts` — deleted.
- `packages/web-shared/src/` — new `format-hours.ts` (or added to existing utils module); exported from barrel.
- `apps/admin-web/src/components/projects/ProjectsTable.vue` — import `formatHours` from `@gitiempo/web-shared`; fix `saveSettings` row-close timing; replace raw buttons.
- `apps/admin-web/src/components/projects/AddProjectForm.vue` — replace raw buttons.
- `apps/admin-web/src/components/layout/AdminPageHeader.vue` — replace raw back-link button.
- `apps/admin-web/src/components/projects/ProjectSourceCard.vue` — replace raw hex with tokens.
- `apps/admin-web/src/views/ProjectsView.vue` — add `save-success` / `save-error` event wiring if `saveSettings` row-close moves to event-driven.
- `apps/user-web/src/composables/useProjectFormatters.ts` — import `formatHours` from `@gitiempo/web-shared` instead of local definition.
- No API contract changes. No DB migrations. No new env vars.

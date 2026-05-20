## Why

The Settings page currently omits the workspace time zone even though the workspace settings API and shared contracts already support `timeZone`. Admins need a visible, validated time-zone selector so calendar-period interpretation can be configured from the existing Settings surface instead of remaining a hidden API-only value.

## What Changes

- Add an editable `Time zone` field to the admin Settings form using a PrimeVue selection control that fits the approved Settings card density.
- Load, display, dirty-check, validate, cancel, and save `timeZone` alongside the existing current API-supported workspace settings fields.
- Provide a deterministic time-zone option source for the selector, preferring runtime-supported IANA time zones with a stable fallback list that includes `UTC` and common regional zones such as `Europe/Kyiv`.
- Update Settings page documentation/specs so Time zone is no longer deferred from the current UI.
- Keep the change frontend/admin-web scoped; do not alter backend endpoints, shared contracts, database schema, migrations, seeds, or OpenAPI artifacts.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-pages`: Settings page requirements now include an editable time-zone selector sourced from existing API-supported workspace settings.

## Impact

- Affected frontend app: `apps/admin-web` Settings form, settings composable/form mapping, Settings view tests, and admin settings client usage where needed.
- Affected docs/specs: `docs/ui/pages-admin.md` and this OpenSpec change's `admin-pages` delta.
- Existing contracts consumed: `packages/shared/src/contracts/workspaces.ts` already validates `timeZone` as a valid IANA time-zone identifier.
- Not affected: `apps/api`, `packages/shared` contract shape, database schema/migrations/seeds, generated OpenAPI artifacts, auth model, and workspace settings endpoints.

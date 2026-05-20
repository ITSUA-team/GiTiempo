## 1. Preparation And Design Parity

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, and `apps/admin-web/AGENTS.md` before implementation.
- [x] 1.2 Re-inspect `GITiempo.pen` frame `h8YRz` (`Admin Settings`) and record a parity checklist for where the new Time zone selector fits in the Workspace section, including label, control height, width, spacing, mobile stacking, skeleton shape, and Save/Cancel behavior.
- [x] 1.3 Inspect existing Settings form, composable, settings client, shared workspace contracts, workspace-settings tests, and current `timeZone` form-state handling before editing.
- [x] 1.4 Confirm implementation remains admin-web frontend scoped and does not require `apps/api`, `packages/shared`, database, seed, migration, or OpenAPI changes.

### Design Parity Checklist

- Workspace section order stays `Workspace name`, `Default hourly rate` + `Currency`, then full-width `Time zone`.
- Time zone label uses the existing 13px medium field label treatment and the control uses the 38px PrimeVue input height.
- Time zone selector spans the full 580px card content width on desktop to avoid crowding long IANA identifiers.
- Default hourly rate and Currency keep the approved desktop row with the 160px currency column and stack on mobile; Time zone remains its own stacked row.
- Card density remains 620px desktop width, 20px padding, 12px workspace field gaps, token-backed surface, rounded-lg, and shadow-card.
- Skeleton adds a matching full-width label/control row below the rate/currency skeleton row before the Billing Defaults separator.
- Save/Cancel remain in the existing bottom action row and preserve the same dirty-state, cancel/reset, validation, and save behavior.

## 2. Time Zone Option Source

- [x] 2.1 Add an admin-web-local time-zone option helper that returns stable `{ label, value }` options, uses `Intl.supportedValuesOf('timeZone')` when available, and falls back to a curated IANA list including `UTC` and `Europe/Kyiv`.
- [x] 2.2 Ensure the option helper sorts `UTC` first, keeps option values as valid IANA identifiers, and includes the current persisted/form value when it is not already in the runtime or fallback option source.
- [x] 2.3 Add focused tests for runtime option generation, fallback generation, current-value inclusion, and no duplicate option values.

## 3. Settings Form UI And State

- [x] 3.1 Extend `SettingsForm.vue` props/models to render an editable PrimeVue `Select` for `Time zone` in the Workspace section, full width below the Default hourly rate + Currency row.
- [x] 3.2 Enable filtering on the Time zone selector and render field-level invalid/helper feedback using the existing Settings form error pattern.
- [x] 3.3 Pass time-zone options and the `timeZone` model through `SettingsView.vue` and `useAdminSettingsPage` without creating a separate save request path.
- [x] 3.4 Preserve existing dirty-state, cancel/reset, validation, save payload derivation, successful reconciliation, and failed-save preservation for `timeZone`.
- [x] 3.5 Update `SettingsPageSkeleton.vue` so the first-load skeleton mirrors the added Time zone row.
- [x] 3.6 Keep inactive Billing Defaults and Organization fields disabled and non-submitting.

## 4. Tests

- [x] 4.1 Update Settings form/view tests to cover Time zone rendering, option display, selection changes, invalid feedback, save enablement, and cancel reset.
- [x] 4.2 Update composable/form tests to cover `timeZone` save payloads, unchanged-field omission, validation failure with no request, successful reconciliation, and save failure preserving edits.
- [x] 4.3 Update skeleton/request-error tests so loading and failed initial loads remain distinct from default form content with the new field present.

## 5. Documentation And Specs

- [x] 5.1 Update `docs/ui/pages-admin.md` so Settings lists `Time zone` as a current editable API-supported field and documents the selector option source.
- [x] 5.2 Ensure this OpenSpec delta remains aligned with the final implementation scope before marking tasks complete.
- [x] 5.3 Document any PrimeVue-only or design-parity compromise in the final implementation review.

## 6. Verification

- [x] 6.1 Run focused admin-web tests for the Settings option helper, form, composable, and view behavior.
- [x] 6.2 Run `pnpm --filter admin-web lint`.
- [x] 6.3 Run `pnpm --filter admin-web typecheck`.
- [x] 6.4 Perform final design parity review against `GITiempo.pen` frame `h8YRz`, including desktop and mobile Time zone field placement.
- [x] 6.5 Run `pnpm exec openspec validate add-settings-timezone-field --strict` and fix validation issues.

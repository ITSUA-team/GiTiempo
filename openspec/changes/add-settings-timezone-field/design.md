## Context

The admin Settings page already loads workspace settings from `/workspace/settings`, and the shared workspace settings contract includes `timeZone` as a contract-valid time-zone identifier, including `UTC` and IANA time-zone names. The current Settings UI renders editable Workspace name, Default hourly rate, and Currency, while `docs/ui/pages-admin.md` still says Time zone is API-supported but deferred until field design and option source are accepted.

The existing admin settings form state and validation already carry `timeZone` through the composable layer, but the form surface does not expose an editable control. This change should finish the UI by adding a visible selector that fits the approved `GITiempo.pen` Settings card and uses the existing API/contract boundary rather than introducing backend or shared-contract changes.

## Goals / Non-Goals

**Goals:**

- Add an editable `Time zone` selector to the Workspace section of the admin Settings card.
- Keep the selector aligned with the existing 620px Settings card density, labels, 38px PrimeVue control height, bottom Save/Cancel flow, skeleton rhythm, and mobile stacking.
- Source options from contract-valid time zones, preferring `Intl.supportedValuesOf('timeZone')` when available and falling back to a stable curated list that includes `UTC` and IANA time-zone names such as `Europe/Kyiv`.
- Include the current persisted time zone in the option list even if it is not present in the runtime/fallback source.
- Save `timeZone` through the existing `/workspace/settings` update path only when the field changed.
- Update admin Settings docs/specs so Time zone is no longer described as deferred.

**Non-Goals:**

- No backend endpoint, database, seed, migration, OpenAPI, or shared contract changes.
- No new global time-zone preference, per-user time zone, localization settings, or automatic conversion behavior outside the existing workspace setting.
- No persistence for the inactive future Billing Defaults or Organization fields.
- No new dependency for time-zone data.

## Decisions

1. Render Time zone as a PrimeVue `Select` in the Workspace section.

   The field should use a real label, `invalid` state, helper/error message, `filter`, and token-backed styling consistent with existing Settings controls. Because time-zone identifiers can be long, the selector should render full width below the existing Default hourly rate + Currency row instead of squeezing into the 160px currency column.

   Alternative considered: use a raw `<select>` for simplicity. Rejected because project UI rules require PrimeVue controls for standard app UI.

2. Keep time-zone option generation admin-web local.

   The option list is browser/UI behavior, not a backend-safe contract. Implement a small admin-web helper that returns `{ label, value }` options, uses `Intl.supportedValuesOf('timeZone')` when available, falls back to a stable curated list with `UTC` and IANA time-zone names, sorts `UTC` first, and appends the persisted value if missing.

   Alternative considered: move the option list into `@gitiempo/shared`. Rejected because `@gitiempo/shared` should stay contract-focused and backend-safe; the shared contract already validates the value.

3. Reuse the existing settings save boundary.

   `timeZone` already belongs to the workspace settings payload. The Settings page should include it in dirty-state, validation, cancel/reset, save payload derivation, success reconciliation, and failed-save preservation without creating a separate request path.

   Alternative considered: save time zone immediately on selection. Rejected because it would break the established Settings page Save/Cancel behavior.

4. Update the first-load skeleton and tests with the visible field.

   The structured Settings skeleton should account for the additional Time zone row so first load still mirrors the final form. Tests should cover rendering, option fallback/current-value inclusion, validation failure, save payload, cancel reset, and request-error separation.

## Risks / Trade-offs

- Browser support for `Intl.supportedValuesOf` can vary -> Use feature detection and a curated fallback list.
- Long IANA identifiers can crowd the card -> Make Time zone full width and enable filtering in the PrimeVue selector.
- Runtime option lists can omit a persisted valid value -> Always include the current persisted/form value when missing.
- Invalid manually injected values can still reach form state in tests or edge cases -> Keep shared `updateWorkspaceSettingsSchema` validation before save and surface field-level errors.

## Migration Plan

- No data migration is required because existing workspace settings already store `timeZone` and seed defaults use `UTC`.
- Deployment is frontend-only; rollback reverts the Settings UI/docs/spec updates and leaves persisted `timeZone` values untouched.

## Open Questions

- None blocking.

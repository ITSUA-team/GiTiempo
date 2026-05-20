## Context

The user-web Dashboard, Projects, and Time Entries surfaces already render the required record content and actions, but their record lists stay table-only on mobile. `DashboardRecentEntriesCard.vue` uses a fixed-width PrimeVue `DataTable`, while `ProjectsTaskSection.vue` and `TimeEntriesDaySection.vue` use `ManagementTableShell` with `min-w-[740px]`. This preserves desktop parity but makes mobile users horizontally scroll dense record rows.

Admin-web has already solved the same class of problem with a custom adaptive pattern: desktop/tablet renders the existing management table, while mobile viewports render stacked record cards using `useIsMobileViewport` and `MobileRecordCard`. The user-web change should reuse that proven pattern instead of introducing PrimeVue `responsiveLayout` or a separate responsive table convention.

Affected instructions:
- Root `AGENTS.md`: use UI docs and approved `.pen` screens as source of truth, extract small shared frontend leaves when behavior is proven identical, and verify both apps when `packages/web-shared` changes.
- `apps/user-web/AGENTS.md`: follow UI docs and approved design, use PrimeVue controls where available, keep route pages app-local, and search for reusable leaves before duplicating page sections.
- `packages/web-shared/AGENTS.md`: shared Vue components belong here only when they are small, browser/runtime-safe, and reused by both SPAs or defined by docs as shared standards.

## Goals / Non-Goals

**Goals:**
- Make user-web record-list surfaces readable on mobile by replacing fixed-width table rendering with stacked cards below the documented mobile breakpoint.
- Preserve the existing desktop/tablet table behavior and desktop `.pen` parity for Dashboard, Projects, and Time Entries.
- Keep row/card content parity: mobile cards must expose the same meaningful record fields and action affordances as the corresponding desktop rows.
- Reuse or extract the existing admin viewport/card pattern when the behavior is identical and remains presentational.
- Add tests proving mobile cards and desktop tables render in the correct viewport modes.

**Non-Goals:**
- Change backend endpoints, OpenAPI, or shared contract shapes.
- Redesign the approved desktop `.pen` screens.
- Add mobile-specific `.pen` frames in this change.
- Replace desktop tables with cards on tablet or desktop.
- Add new dashboard, projects, or time-entry data fields beyond the fields already rendered in current rows.

## Decisions

1. **Use the admin adaptive pattern: desktop table, mobile cards.**
   - Rationale: Admin-web already uses this pattern successfully and it matches the repo's mobile breakpoint model. It avoids forcing complex table columns into narrow viewports.
   - Alternative considered: Use PrimeVue DataTable `responsiveLayout`. Rejected because admin has already standardized on explicit mobile card fallbacks and the user surfaces need careful row/action parity rather than a generic table transform.

2. **Treat `<640px` as the mobile breakpoint.**
   - Rationale: `docs/ui/layout.md` defines mobile as below `640px`, and admin's `useIsMobileViewport` uses `(max-width: 639px)`.
   - Alternative considered: Drive the switch only through CSS utility visibility classes. Rejected because the table/card branches need distinct markup and tests should be able to assert one semantic surface is rendered for each viewport.

3. **Extract only small proven-identical leaves to `packages/web-shared`.**
   - Rationale: `MobileRecordCard` is presentational, token-based, and useful in both SPAs; the viewport composable is a small browser runtime helper with identical breakpoint behavior. The full user/card row renderers remain app-local because their content is product-specific.
   - Alternative considered: Duplicate admin's `MobileRecordCard` and viewport composable in user-web. Rejected because the repo favors small shared leaves once behavior is proven identical and this would create breakpoint/style drift.

4. **Keep desktop/table implementations unchanged except for conditional rendering.**
   - Rationale: Current desktop components already match the approved desktop sources and tests assert fixed-width table contracts. The adaptive work should not reflow or redesign desktop pages.
   - Alternative considered: Create a new shared responsive table/card component. Rejected as over-broad because each surface has different fields, row states, and actions.

5. **Use viewport-focused unit/component tests instead of browser-only validation.**
   - Rationale: Admin already covers this style with `matchMedia` mocks. User-web tests should prove that mobile cards replace tables, desktop tables remain, action labels stay accessible, and running entries do not expose edit/delete actions.
   - Alternative considered: Rely on manual responsive QA only. Rejected because mobile/desktop branch drift is likely without explicit regression coverage.

## Risks / Trade-offs

- [Risk] Mobile card fields can drift from desktop row fields over time. → Mitigation: keep card markup near each table component and add tests for representative field/action parity.
- [Risk] Extracting shared leaves can cause admin import regressions. → Mitigation: update admin imports in the same implementation step and run admin lint/typecheck/tests when `packages/web-shared` changes.
- [Risk] No approved mobile `.pen` frames exist. → Mitigation: preserve desktop design for desktop/tablet and derive mobile cards from documented tokens plus the already-shipped admin mobile card pattern.
- [Risk] Conditional viewport rendering can be SSR-hostile if it directly assumes `window`. → Mitigation: keep the composable's existing no-window fallback and use `matchMedia` only when available.

## Migration Plan

1. Move or recreate the admin mobile viewport/card leaves in `packages/web-shared`, then update admin imports to consume the shared exports.
2. Add mobile card branches to the three user-web record-list components while keeping existing table branches for non-mobile viewports.
3. Add or update viewport-focused tests for user-web and adjust admin tests only if import paths change.
4. Verify `user-web` and `admin-web` lint, typecheck, and relevant tests.
5. Rollback strategy: revert shared leaf extraction and the user-web conditional card branches together, returning all surfaces to the current table-only implementation.

## Open Questions

- None blocking. If implementation finds the shared card primitive needs product-specific variants, keep only the neutral wrapper shared and leave all record content app-local.

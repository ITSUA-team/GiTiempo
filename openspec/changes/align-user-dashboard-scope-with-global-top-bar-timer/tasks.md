## 1. Source Alignment

- [x] 1.1 Update the `user-pages` spec so the dashboard overview requirement matches the change delta and no longer requires dashboard page-content timer controls.
- [x] 1.2 Confirm `docs/ui/pages-user.md`, `docs/ui/layout.md`, and the approved `GITiempo.pen` User Dashboard screen remain aligned with the updated spec.

## 2. Dashboard Data Strategy

- [x] 2.1 Review existing `user-web` time-entry/project clients and confirm the MVP strategy: recent entries load from the first own-entry page while weekly focus and week-level stats load all current-week own-entry pages before deriving aggregates.
- [x] 2.2 If accurate dashboard aggregates require a new API contract, stop implementation and open a separate proposal instead of inventing endpoint behavior in this change.

## 3. Frontend Implementation

- [x] 3.1 Replace the `DashboardView.vue` placeholder with the approved dashboard overview structure: header, optional stats row, weekly focus insight, and recent entries card/table.
- [x] 3.2 Implement dashboard loading, empty, request-error, and populated states using documented shared UI patterns and PrimeVue components where applicable.
- [x] 3.3 Ensure dashboard page content contains no duplicate timer start/stop controls and relies on the existing global top-bar timer for running timer actions.
- [x] 3.4 Match desktop layout, spacing, hierarchy, and action placement to the approved `GITiempo.pen` User Dashboard screen while keeping documented shared UI rules as the source of truth when docs and design differ, and document any PrimeVue-only compromise.

## 4. Tests and Verification

- [x] 4.1 Add or update focused `user-web` tests for dashboard populated, loading, empty, and request-error behavior.
- [x] 4.2 Add or update coverage that asserts timer controls remain owned by the global top bar rather than the dashboard page content.
- [x] 4.3 Run `pnpm --filter user-web test`, `pnpm --filter user-web lint`, and `pnpm --filter user-web typecheck`.

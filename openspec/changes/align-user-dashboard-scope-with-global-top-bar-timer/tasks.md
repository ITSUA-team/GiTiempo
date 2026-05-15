## 1. Source Alignment

- [ ] 1.1 Update the `user-pages` spec so the dashboard overview requirement matches the change delta and no longer requires dashboard page-content timer controls.
- [ ] 1.2 Confirm `docs/ui/pages-user.md`, `docs/ui/layout.md`, and the approved `GITiempo.pen` User Dashboard screen remain aligned with the updated spec.

## 2. Dashboard Data Strategy

- [ ] 2.1 Review existing `user-web` time-entry/project clients and decide whether recent entries, weekly focus, and stat surfaces can be computed from existing endpoints without contract changes.
- [ ] 2.2 If accurate dashboard aggregates require a new API contract, stop implementation and open a separate proposal instead of inventing endpoint behavior in this change.

## 3. Frontend Implementation

- [ ] 3.1 Replace the `DashboardView.vue` placeholder with the approved dashboard overview structure: header, optional stats row, weekly focus insight, and recent entries card/table.
- [ ] 3.2 Implement dashboard loading, empty, request-error, and populated states using documented shared UI patterns and PrimeVue components where applicable.
- [ ] 3.3 Ensure dashboard page content contains no duplicate timer start/stop controls and relies on the existing global top-bar timer for running timer actions.
- [ ] 3.4 Match desktop layout, spacing, hierarchy, typography, and action placement to the approved `GITiempo.pen` User Dashboard screen, documenting any PrimeVue-only compromise.

## 4. Tests and Verification

- [ ] 4.1 Add or update focused `user-web` tests for dashboard populated, loading, empty, and request-error behavior.
- [ ] 4.2 Add or update coverage that asserts timer controls remain owned by the global top bar rather than the dashboard page content.
- [ ] 4.3 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.

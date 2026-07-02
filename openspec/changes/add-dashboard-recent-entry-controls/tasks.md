## 1. Requirements And Design Alignment

- [x] 1.1 Update `docs/ui/pages-user.md` so Dashboard Recent Time Entries row/card controls are allowed while standalone Dashboard timer widgets remain out of scope.
- [x] 1.2 Confirm the Dashboard implementation uses `apps/user-web/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, and `docs/ui/components.md` as the active frontend guidance.

## 2. Dashboard Data And Action Wiring

- [x] 2.1 Extend Dashboard recent-entry row mapping with the minimal timer payload needed for start/stop actions: entry id, ended state, task id, and task title.
- [x] 2.2 Wire Dashboard overview to a narrow timer lifecycle client boundary that includes own-entry listing, current-timer guard state, `startTimer`, and `stopTimer` only.
- [x] 2.3 Reuse the existing direct timer action workflow so completed Dashboard recent entries start a fresh timer for the same task without opening the top-bar task-picker popup.
- [x] 2.4 Reuse the existing current-timer guard workflow so Dashboard stop actions verify the clicked running row is still authoritative before stopping.
- [x] 2.5 Ensure successful Dashboard direct timer mutations reconcile visible Dashboard state and show success feedback, while failed mutations show the backend/client error message.

## 3. Dashboard Recent Entries UI

- [x] 3.1 Render icon-only `Start timer` controls before the task label for completed Dashboard recent-entry desktop rows.
- [x] 3.2 Render icon-only `Stop timer` controls before the task label for the active running Dashboard recent-entry desktop row.
- [x] 3.3 Render equivalent `Start timer` / `Stop timer` controls in Dashboard recent-entry mobile cards below the mobile breakpoint.
- [x] 3.4 Preserve existing task title, project, range, duration, GitHub issue link, running highlight, and `View all` behavior in both desktop and mobile branches.
- [x] 3.5 Preserve disabled and pending visual/action states for direct starts and stops, including disabled direct starts while current timer state is active or still loading.

## 4. Tests And Verification

- [x] 4.1 Add or update Dashboard recent-entry component tests for desktop controls, mobile controls, accessible labels/tooltips, emitted payloads, and disabled direct starts.
- [x] 4.2 Add or update Dashboard overview tests for wiring start/stop events through the route composition layer.
- [x] 4.3 Add or update Dashboard overview/composable tests for recent-entry timer payload mapping and narrow timer lifecycle client dependencies.
- [x] 4.4 Run `pnpm --filter user-web lint`.
- [x] 4.5 Run `pnpm --filter user-web typecheck`.
- [x] 4.6 Run focused/user-web Vitest coverage for Dashboard recent entries, Dashboard overview wiring, direct timer action regressions, and responsive branches.

## 5. Review

- [x] 5.1 Confirm no backend, migration, generated contract, admin-web, or shared theme changes are needed.
- [x] 5.2 Confirm the final UI matches issue #281 intent and documents any approved-design limitations caused by unavailable `.pen` inspection or PrimeVue constraints.
- [x] 5.3 Run `openspec validate add-dashboard-recent-entry-controls --strict` before implementation is marked ready.

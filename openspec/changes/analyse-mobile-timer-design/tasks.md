## 1. Design Parity And Scope

- [x] 1.1 Inspect `GITiempo.pen` frame `Mobile Timer - Selected Safe F` (`qTKvU`) and record the implementation checklist in `design.md`: mobile strip position, left action stack, right task metadata, spacing, radii, and token usage.
- [x] 1.2 Re-read `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/pages-user.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and `packages/web-shared/AGENTS.md` before editing shared shell or timer code.

## 2. Shell And Timer Implementation

- [x] 2.1 Update `WorkspaceHeader` so the center slot can render as a mobile row below the top bar only when center content exists, while preserving desktop/tablet center-slot layout and admin-web behavior.
- [x] 2.2 Update `TopBarTimer` to render the selected mobile strip below `640px` with Start/Stop and Change actions on the left and task context metadata on the right.
- [x] 2.3 Preserve existing timer state behavior for loading, request error, no eligible task, idle last tracked task, running elapsed time, pending actions, and task-picker dialog opening.
- [x] 2.4 Ensure the mobile timer actions remain usable when the profile menu opens from the top-right identity area, with any overlapped area limited to non-critical task metadata.
- [x] 2.5 Update `TopBarTimerTaskDialog` so the mobile Change task flow uses a near-full-width scrollable dialog with full-width stacked actions ordered `Use selected task` before `Cancel`.

## 3. Specs And UI Docs Alignment

- [x] 3.1 Update `docs/ui/layout.md` to describe the mobile timer strip and dropdown-safe action placement.
- [x] 3.2 Update `docs/ui/pages-user.md` to keep global timer ownership aligned across desktop and mobile authenticated pages.
- [x] 3.3 Update `docs/ui/patterns.md` to describe the mobile task-picker dialog action sizing and ordering.

## 4. Tests And Verification

- [x] 4.1 Add or update focused `TopBarTimer` tests for desktop compact rendering, mobile selected-strip rendering, running elapsed state, disabled/loading state, and Change task affordance.
- [x] 4.2 Add or update shell/header tests proving the user-web mobile timer row is present without duplicating timer state and admin-web remains unaffected.
- [x] 4.3 Add or update mobile shell/header coverage for the accepted interaction model: always prove Start/Stop and Change remain visible/actionable beside the top-right identity/avatar region, and when an active profile-menu spec is included, also open the real shared profile menu overlay and prove any overlap is limited to non-critical task metadata.
- [x] 4.4 Run `pnpm --filter @gitiempo/web-shared lint` and `pnpm --filter @gitiempo/web-shared typecheck` if shared header code changes.
- [x] 4.5 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 4.6 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck` because shared header code changes affect admin-web shell rendering.
- [x] 4.7 Add or update focused `TopBarTimerTaskDialog` tests for mobile dialog sizing, scroll behavior, full-width stacked buttons, and mobile action order with `Use selected task` before `Cancel`.
- [x] 4.8 Run focused affected tests, including `TopBarTimer`, `TopBarTimerTaskDialog`, and shell/header specs, and document any PrimeVue-only design compromises.
- [x] 4.9 Add or update focused accessibility checks from `docs/ui/accessibility.md` for the mobile timer flow: Start/Stop, Change, and context controls expose accessible names, disabled timer actions use disabled semantics, closing the task-picker dialog restores focus to the invoking timer control, and the live `HH:MM:SS` elapsed display is not assertive or announced every second.

## 5. Scope And Archive Readiness

- [x] 5.1 Verify the final accepted `frontend-shared-leaves` spec preserves both the shared profile-dropdown shell scenario and the mobile center-row scenario when this change is archived with `add-profile-dropdown-menu`.
- [x] 5.2 Remove or split any `apps/chrome-ext/dist/*` branch files before implementation review because Chrome extension artifacts are outside this change scope.

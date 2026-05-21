## 1. Design Parity And Scope

- [x] 1.1 Inspect `GITiempo.pen` frame `Mobile Timer - Selected Safe F` (`qTKvU`) and record the implementation checklist: mobile strip position, left action stack, right task metadata, spacing, radii, and token usage.
- [x] 1.2 Re-read `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/pages-user.md`, `apps/user-web/AGENTS.md`, and `packages/web-shared/AGENTS.md` before editing shared shell or timer code.

## 2. Shell And Timer Implementation

- [x] 2.1 Update `WorkspaceHeader` so the center slot can render as a mobile row below the top bar only when center content exists, while preserving desktop/tablet center-slot layout and admin-web behavior.
- [x] 2.2 Update `TopBarTimer` to render the selected mobile strip below `640px` with Start/Stop and Change actions on the left and task context metadata on the right.
- [x] 2.3 Preserve existing timer state behavior for loading, request error, no eligible task, idle last tracked task, running elapsed time, pending actions, and task-picker dialog opening.
- [x] 2.4 Ensure the mobile timer actions remain usable when the profile menu opens from the top-right identity area, with any overlapped area limited to non-critical task metadata.

## 3. Specs And UI Docs Alignment

- [x] 3.1 Update `docs/ui/layout.md` to describe the mobile timer strip and dropdown-safe action placement.
- [x] 3.2 Update `docs/ui/pages-user.md` to keep global timer ownership aligned across desktop and mobile authenticated pages.

## 4. Tests And Verification

- [x] 4.1 Add or update focused `TopBarTimer` tests for desktop compact rendering, mobile selected-strip rendering, running elapsed state, disabled/loading state, and Change task affordance.
- [x] 4.2 Add or update shell/header tests proving the user-web mobile timer row is present without duplicating timer state and admin-web remains unaffected.
- [x] 4.3 Run `pnpm --filter @gitiempo/web-shared lint` and `pnpm --filter @gitiempo/web-shared typecheck` if shared header code changes.
- [x] 4.4 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 4.5 Run focused affected tests, including `TopBarTimer` and shell/header specs, and document any PrimeVue-only design compromises.

## Context

`apps/user-web` renders the global timer through `TopBarTimer` in the shared `WorkspaceHeader` center slot. The current desktop design is compact and centered in the `h-16` top bar, but mobile width leaves the timer competing with product identity and profile controls. The selected design source is `GITiempo.pen` frame `Mobile Timer - Selected Safe F` (`qTKvU`), where the timer becomes a full-width strip directly below the mobile top bar with Start/Change actions stacked on the left and task context as readable metadata on the right.

Relevant source-of-truth files are `docs/ui/layout.md`, `docs/ui/pages-user.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and shared header ownership in `packages/web-shared/AGENTS.md` if the shared header structure changes. The active `add-profile-dropdown-menu` OpenSpec change also modifies shared header ownership, so this change must preserve that profile-dropdown contract while adding only mobile center-row behavior.

## Goals / Non-Goals

**Goals:**

- Preserve the current desktop/tablet compact timer behavior in the top-bar center region.
- Implement the selected mobile timer design from `GITiempo.pen` frame `qTKvU` below `640px`.
- Keep timer Start/Stop and Change task actions available when the top-right profile menu opens by placing primary timer actions in the left side of the mobile strip.
- Keep the task-picker dialog usable from the mobile strip with mobile-width sizing, scrollable content, and full-width stacked actions.
- Preserve existing timer state semantics: loading, no eligible task, idle with last tracked task, running elapsed time, disabled states, and task picker dialog behavior.
- Add focused tests for mobile and desktop render branches.

**Non-Goals:**

- No backend, contract, database, OpenAPI, or time-entry API changes.
- No new dedicated Timer route or page-content timer widget.
- No new task-selection model beyond the existing visible Project -> Task picker.
- No changes to admin-web timer behavior; admin-web still has no top-bar timer.
- No Chrome extension build, manifest, popup, content-script, or runtime changes.

## Decisions

1. Use a mobile-specific timer strip under the top bar instead of squeezing the desktop compact timer into the mobile center slot.

   Rationale: The selected design needs a full-width strip to keep actions touch-sized and readable. Squeezing the desktop component would conflict with the profile/avatar area and would not satisfy the dropdown-safe requirement.

   Alternative considered: Floating timer card above bottom navigation. Rejected because it competes with bottom navigation and can obscure page content, while the selected design is anchored to shell chrome.

2. Keep one `TopBarTimer` instance and one timer composable instance.

   Rationale: Duplicating the component for desktop and mobile would create duplicate requests, timers, dialogs, and pending state. The implementation should render responsive branches within the same component instance or move the single slot responsively through the shared header structure.

   Alternative considered: Render a second mobile-only `TopBarTimer` below `WorkspaceHeader`. Rejected because it risks duplicate composable state and duplicate dialogs.

3. Make the shared header support a mobile center-slot row only when center content exists.

   Rationale: `WorkspaceHeader` already owns the shell top bar and center slot. Allowing the center slot to span below the mobile top row keeps the timer in shell chrome and avoids fixed overlays. Admin-web remains unaffected because it does not provide center content.

   Alternative considered: Position the mobile timer with `fixed top-16`. Rejected because it would require extra page padding and could overlap content during scrolling.

4. Keep timer actions on the left and context metadata on the right for mobile.

   Rationale: The profile menu opens from the right identity area, so the right side can be partially obscured while actions remain usable. The task context remains clickable where visible, and the left Change action also opens the existing task picker.

   Alternative considered: Put Start/Stop on the right, matching desktop visual order. Rejected because it can be covered by the profile menu and violates the requirement that features remain allowable.

5. Keep mobile task-picker dialog controls full-width and ordered for the mobile flow.

   Rationale: The mobile `Change` action is the guaranteed task-picker entry point, so the resulting dialog must be usable on a narrow screen. The primary `Use selected task` action should appear before `Cancel` in the mobile stacked footer, while desktop can preserve the conventional cancel-then-primary visual order.

## Design Parity Checklist

- Mobile strip is attached to shell chrome directly below the mobile top row.
- Primary timer action and Change task action are stacked on the left.
- Task status, elapsed running time, and `Project / Task` metadata render on the right and may truncate before hiding actions.
- Mobile strip uses existing token colors, rounded control treatment, and compact typography from `docs/ui/*`.
- Task-picker dialog remains a PrimeVue `Dialog`, uses visible `Project -> Task` selection only, has scrollable content on mobile, and uses full-width stacked mobile actions with `Use selected task` before `Cancel`.

## Risks / Trade-offs

- Mobile header height increases when the timer is present -> Keep the expanded height limited to the selected strip and verify authenticated pages still have adequate top spacing.
- Shared header changes can affect admin-web -> Render the mobile center row only when a center slot exists and verify both web apps if shared header is touched.
- Shared header specs are also changed by `add-profile-dropdown-menu` -> Preserve the shared profile-dropdown shell scenario in this delta so archive order cannot erase the accepted dropdown contract.
- Task context text may be partially covered by a profile menu -> Keep Start/Stop and Change actions on the left, and keep task-picker access through the left Change action.
- Task-picker dialog actions can become too narrow on mobile -> Make the mobile footer full width and stack the primary action before cancel.
- Responsive branches can drift -> Add focused component tests for desktop compact mode and mobile strip mode.

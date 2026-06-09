## Context

The UI pattern source of truth now says non-destructive PrimeVue form dialogs use a footer with the primary action only and rely on the built-in top-right Dialog close control for dismissal. The affected Vue implementations are split across `apps/user-web` and `apps/admin-web`, with shared styling provided by PrimeVue v4, Tailwind CSS v4 token utilities, and the shared PrimeVue preset.

Current implementation scan found these relevant surfaces:

- `apps/user-web/src/components/projects/ProjectTaskDialog.vue` renders a task create/update popup footer with `Cancel` plus the save action.
- `apps/user-web/src/components/time-entries/TimeEntryDialog.vue` renders a time-entry create/edit popup footer with `Cancel` plus the save action.
- `apps/user-web/src/components/timer/TopBarTimerTaskDialog.vue` renders a task-picker popup footer with `Cancel`, primary action, and a contextual running-timer `Change task` action.
- `apps/admin-web/src/views/InvoicesView.vue` is currently a route scaffold for the future invoice workflow, while the existing admin page spec already reserves a create-invoice dialog flow.
- `apps/admin-web/src/components/forms/MemberInviteDialog.vue` is an existing non-destructive popup form dialog with `Cancel` plus `Send Invite`, and should follow the same shared dialog pattern if touched by the implementation pass.

The relevant app instructions are `apps/user-web/AGENTS.md` and `apps/admin-web/AGENTS.md`; both require `docs/ui/INDEX.md`, the smallest relevant `docs/ui/*` files, and the approved `.pen` frame before implementation. `GITiempo.pen` exists in the repo, but the current Pencil API session could not inspect it because the file was not open in the editor, so implementation must reopen or otherwise inspect the affected approved frames before editing.

## Goals / Non-Goals

**Goals:**

- Bring non-destructive popup form dialog footers in both SPAs into alignment with `docs/ui/patterns.md` and the updated `GITiempo.pen` references.
- Preserve dismissal through PrimeVue Dialog's top-right close control and existing non-destructive mask behavior where enabled.
- Preserve saving/submitting behavior and loading/disabled guards for the remaining primary footer actions.
- Keep mobile popup primary actions full width where the component already uses a mobile footer branch.
- Update specs and tests so old footer `Cancel` expectations do not reintroduce the duplicate action.

**Non-Goals:**

- Do not change backend APIs, shared Zod contracts, database schema, OpenAPI output, or authentication behavior.
- Do not remove destructive confirmation safe/reject actions from `ConfirmDialog` flows.
- Do not remove non-popup form reset `Cancel` buttons such as Profile identity or Admin Settings.
- Do not remove row actions such as pending-invite `Cancel invite`.
- Do not redesign dialog fields, validation, endpoint flows, or task/timer business rules beyond footer action alignment.

## Decisions

### Decision: Treat Dialog Dismissal As The Secondary Exit For Non-Destructive Popups

Non-destructive popup dialogs will remove explicit footer/body `Cancel` buttons and keep only the primary submit/save action in the footer. Users can dismiss through PrimeVue Dialog's built-in top-right close control and, where currently enabled and non-destructive, the mask dismissal behavior.

Alternative considered: keep footer `Cancel` for keyboard or discoverability. This conflicts with the updated design and documentation, and duplicates the Dialog close affordance.

### Decision: Preserve Contextual Non-Cancel Actions

`TopBarTimerTaskDialog` can still keep contextual non-cancel actions that change timer state, such as `Change task` for a running timer, because they are domain actions rather than dismissal controls. The primary footer action remains the state-appropriate timer action, and `Change task` stays visually secondary.

Alternative considered: reduce every non-destructive popup footer to one button regardless of domain context. That would remove existing timer functionality and conflicts with the documented top-bar timer behavior that distinguishes primary timer actions from changing the running task.

### Decision: Keep The Change Local To Existing Popup Components

Implementation should update the existing dialog components directly instead of introducing a new shared dialog footer abstraction. The change is small, component-local, and does not require a new dependency or shared package API.

Alternative considered: extract a shared `DialogFooter` leaf. This is unnecessary unless the implementation finds duplicated footer markup that needs more than removing one button; premature extraction would add surface area for a narrow visual alignment task.

### Decision: Verification Uses Focused Component Tests Plus App Checks

Update focused Vue tests for affected dialog components to assert the absence of non-destructive footer `Cancel` controls, continued close-on-Dialog-dismiss behavior where stubs expose `update:visible`, and continued save/submit behavior. Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test` for user-web changes and the equivalent admin commands if admin-web implementation files or tests change.

Alternative considered: rely only on manual visual checks. This would miss regressions in event wiring and stale test expectations around footer order, especially for mobile timer footer behavior.

## Risks / Trade-offs

- Users accustomed to footer `Cancel` may look for a secondary button. Mitigation: keep PrimeVue's visible top-right close control enabled whenever the dialog is not in a protected saving/submitting state, and preserve mask dismissal where currently allowed.
- Tests may use broad text assertions for `Cancel` and fail because unrelated exclusions still contain `Cancel`. Mitigation: scope test assertions to the affected dialog footer or specific component under test, and add regression checks for excluded destructive/non-popup/row actions separately.
- The admin invoice dialog may not yet be implemented on the current branch. Mitigation: make the task an audit-and-update step; if still scaffolded, record no code change is needed there and ensure any new invoice dialog implementation follows the spec.
- Pencil design parity cannot be verified from the current API session unless `GITiempo.pen` is opened. Mitigation: implementation must inspect the affected frames before code changes and document any PrimeVue-only deviations in the final review.

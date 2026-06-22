## Context

The UI pattern source of truth now says non-destructive PrimeVue form dialogs use a footer with the primary action only and rely on the built-in top-right Dialog close control for dismissal. The affected Vue implementations are split across `apps/user-web` and `apps/admin-web`, with shared styling provided by PrimeVue v4, Tailwind CSS v4 token utilities, and the shared PrimeVue preset.

Current implementation scan found these relevant surfaces:

- `apps/user-web/src/components/projects/ProjectTaskDialog.vue` renders a task create/update popup footer with `Cancel` plus the save action.
- `apps/user-web/src/components/time-entries/TimeEntryDialog.vue` renders a time-entry create/edit popup footer with `Cancel` plus the save action.
- `apps/user-web/src/components/timer/TopBarTimerTaskDialog.vue` renders a task-picker popup footer with `Cancel`, primary action, and a contextual running-timer `Change task` action.
- `apps/admin-web/src/views/InvoicesView.vue` is currently a route scaffold for the future invoice workflow, while the existing admin page spec already reserves a create-invoice dialog flow.
- `apps/admin-web/src/components/forms/MemberInviteDialog.vue` is an existing non-destructive popup form dialog with `Cancel` plus `Send Invite`, and should follow the same shared dialog pattern if touched by the implementation pass.
- `apps/admin-web/src/components/MembersTable.vue` and `apps/admin-web/src/components/ProjectsTable.vue` still had separate row action columns even though `docs/ui/pages-admin.md` defines the member/project names as the edit entry points and places destructive or status-specific actions inside inline settings.
- `apps/admin-web/src/components/PendingInvitationsCard.vue` intentionally keeps its pending-invite `Actions` column because `docs/ui/pages-admin.md` and the issue acceptance criteria preserve row actions such as `Cancel invite`.

The relevant app instructions are `apps/user-web/AGENTS.md` and `apps/admin-web/AGENTS.md`; both require `docs/ui/INDEX.md`, the smallest relevant `docs/ui/*` files, and the approved `.pen` frame before implementation. The Pencil editor API could not inspect `GITiempo.pen` because no file was open in the editor, so the final parity review inspected the checked-in `.pen` JSON directly. Relevant frames reviewed include `Task Dialog`, `Time Entries` dialog content, `Top-Bar Timer Task Picker`, `Admin Invoices`, `Admin Members`, and `Admin Projects`.

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

### Decision: Apply Action-Column Cleanup To Admin Management Tables

The PR also removes separate action columns from admin Members and Projects tables so the action-column cleanup is project-wide rather than limited to user views. Member and project names become the edit entry points, while `Remove member`, `Archive project`, and `Unarchive project` live in the inline settings sections that own those entity changes.

Alternative considered: leave admin management action columns for a later PR. This would keep the project in a mixed state where user tables follow the updated row-entry pattern and admin tables still expose separate edit/destructive icons despite the admin page docs saying otherwise.

### Decision: Verification Uses Focused Component Tests Plus App Checks

Update focused Vue tests for affected dialog components to assert the absence of non-destructive footer `Cancel` controls, continued close-on-Dialog-dismiss behavior where stubs expose `update:visible`, and continued save/submit behavior. Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test` for user-web changes and the equivalent admin commands if admin-web implementation files or tests change.

Alternative considered: rely only on manual visual checks. This would miss regressions in event wiring and stale test expectations around footer order, especially for mobile timer footer behavior.

### Decision: Docs Override Older Invite Dialog Mock Footer

The checked-in `GITiempo.pen` JSON still shows the `Invite Member` popup with a footer `Cancel` next to `Send Invite`, while `docs/ui/patterns.md` requires non-destructive form dialogs to rely on the built-in close control and keep only the primary action. The implementation follows the docs and active spec by rendering only `Send Invite` for this popup.

Alternative considered: preserve the `.pen` invite footer `Cancel`. That would contradict the shared popup pattern and keep this admin dialog inconsistent with the other affected non-destructive popups.

## Risks / Trade-offs

- Users accustomed to footer `Cancel` may look for a secondary button. Mitigation: keep PrimeVue's visible top-right close control enabled whenever the dialog is not in a protected saving/submitting state, and preserve mask dismissal where currently allowed.
- Tests may use broad text assertions for `Cancel` and fail because unrelated exclusions still contain `Cancel`. Mitigation: scope test assertions to the affected dialog footer or specific component under test, and add regression checks for excluded destructive/non-popup/row actions separately.
- The admin invoice dialog may not yet be implemented on the current branch. Mitigation: make the task an audit-and-update step; if still scaffolded, record no code change is needed there and ensure any new invoice dialog implementation follows the spec.
- The Pencil editor API cannot inspect `GITiempo.pen` unless the file is open in the editor. Mitigation: the parity review inspected the checked-in `.pen` JSON directly and recorded the only docs-vs-design exception above.

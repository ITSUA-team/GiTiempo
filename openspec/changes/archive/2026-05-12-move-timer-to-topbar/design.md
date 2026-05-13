## Context

The approved user-web UI direction has moved timer control from a dedicated page into authenticated shell chrome. `docs/ui/pages-user.md`, `docs/ui/layout.md`, and `docs/ui/patterns.md` define the global top-bar timer and the top-bar task picker. `GITiempo.pen` includes explicit reference frames for `User Topbar Timer States` and `Top-Bar Timer Task Picker`.

The current implementation still has `/timer`, a Timer navigation item, `TimerPageContent.vue`, and `useTimerPage()` that combine timer start/stop, project/task selection, current-timer polling, and manual interval creation in one page-oriented feature. The authenticated header is shared through `packages/web-shared/src/components/WorkspaceHeader.vue`, but it currently has only left and right regions and no app-owned center content region.

The backend already exposes the needed API surface: current timer, start timer, stop timer, own time-entry listing, visible projects, project tasks, and task creation. This change is therefore frontend-focused and should not introduce new backend contracts unless implementation proves the existing `GET /time-entries?limit=1` workflow cannot satisfy the documented behavior with reasonable client-side validation.

## Goals / Non-Goals

**Goals:**

- Render a compact timer surface in the center of every authenticated `user-web` top bar.
- Remove the dedicated Timer route and sidebar item from user-web.
- Preserve admin-web header behavior while extending the shared header with an app-owned center region.
- Reuse existing API endpoints and shared Zod contracts for timer, time-entry, project, and task payloads.
- Keep route-level composition and user-web timer orchestration app-local.

**Non-Goals:**

- No pause/resume timer behavior.
- No GitHub provider selector or external-provider-only behavior in the user-web top-bar timer.
- No project creation inside the top-bar task-picker dialog.
- No backend data model migration.
- No admin-web top-bar timer.
- No Chrome extension timer UI changes.

## Decisions

1. Extend `WorkspaceHeader` with a center slot instead of moving timer logic into `@gitiempo/web-shared`.

   The shared header is already consumed by both SPAs, but the timer is user-web-only product behavior. A slot keeps header chrome reusable while letting `apps/user-web` own timer state, API calls, route interaction, and tests. The alternative was adding timer props/events directly to `WorkspaceHeader`, but that would leak user-web-only behavior into the shared package and force admin-web to understand unused timer state.

2. Extract page-oriented timer behavior into a compact timer feature rather than reusing `TimerPageContent.vue`.

   The current component includes full-page selector layout and manual interval controls that explicitly do not belong in the top bar. The implementation should preserve reusable logic where it is still correct, but the new feature boundary should align to the compact top-bar timer and task-picker dialog. The alternative was to mount the existing page component in the header, which would violate the approved design and keep manual interval entry in the wrong surface.

3. Use existing endpoint composition for last tracked task context.

   The compact timer should load `GET /time-entries?limit=1` for the most recent own entry, then validate that candidate against visible projects and active project tasks before enabling Start. If the most recent entry is not eligible, the client may request additional recent entries in small pages until it finds an eligible task or exhausts a bounded search. This keeps the change frontend-focused. The alternative is a new backend summary endpoint, which is cleaner long-term but is not required by the current docs or contracts.

4. Keep Time Entries record-management work out of this change.

   The missing Time Entries page record-management surface is larger than the shell and timer move itself. This change stays focused on authenticated header behavior, timer state, and route cleanup; the Time Entries page remains follow-up work. The alternative was to keep both scopes together, but that mixes a global shell refactor with a separate page implementation and makes test closure harder.

5. Remove `/timer` rather than redirecting it as a supported route.

   The route inventory should match the UI docs: dashboard, time entries, project view, and profile. If a user manually visits `/timer`, normal router fallback behavior can apply once the route is removed. A dedicated redirect would preserve an undocumented entry point and weaken the route contract.

## Risks / Trade-offs

- Last tracked context may require multiple list requests if the newest time entry references an inactive or no-longer-visible task → bound the search, keep the start action disabled when no eligible task is found, and surface load failures through toast feedback.
- Shared header slot changes can affect admin-web layout → keep the default slot empty, preserve current right/left markup, and verify both web apps when `packages/web-shared` changes.
- Top-bar timer introduces shell-level async behavior on every authenticated page → scope to user-web shell, keep loading/error states compact, and avoid blocking route rendering on timer summary failure.
- Removing `/timer` invalidates direct bookmarks → document the breaking route removal in specs and keep the replacement journey explicitly scoped to the top-bar timer in this change.

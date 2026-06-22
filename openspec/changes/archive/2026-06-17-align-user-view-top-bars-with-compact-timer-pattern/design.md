## Context

GitHub issue #206 asks the remaining user-web top bars to match the approved compact timer pattern: compact two-line timer surface, timer controls owned by the popup flow, avatar-side alignment, and avatar-only user-web profile trigger. The approved `GITiempo.pen` user views already show this direction across Dashboard, Time Entries, Profile, Projects, and related profile-dropdown-open shell variants.

The current frontend has the implementation pieces, but they are not aligned in one place:

- `apps/user-web` owns the timer state, summary, task picker, and shell composition.
- `packages/web-shared` owns the reusable authenticated `WorkspaceHeader` profile/dropdown chrome and center-slot layout.
- Existing timer API clients and shared contracts already cover current timer, start, stop, running-entry task reassignment, project lookup, task lookup, and task creation.
- UI docs are mostly aligned, but accessibility wording still refers to rendered header-visible `Start` and `Stop` action text.

Nearest guidance for implementation is root `AGENTS.md`, `apps/user-web/AGENTS.md`, `packages/web-shared/AGENTS.md`, and `docs/ui/INDEX.md` routed to `layout.md`, `pages-user.md`, `patterns.md`, and `accessibility.md`.

## Goals

- Align user-web authenticated top bars with the approved compact timer pattern across base and profile-dropdown-open shell variants.
- Keep the running elapsed counter inside the compact timer surface.
- Make the compact desktop surface and mobile `Task & timer` strip opener the only shell-level entry points into timer actions.
- Move visible `Start timer`, `Stop timer`, and task-change confirmation controls into the task-picker popup flow.
- Remove visible member-name text from the user-web profile trigger while keeping the avatar/profile dropdown behavior.
- Preserve admin-web header identity text and scope label behavior.
- Reuse existing timer, project, task, and time-entry contracts without backend shape changes.

## Non-Goals

- No backend, database, OpenAPI, or shared contract changes.
- No new timer semantics such as pause/resume, manual interval creation from the top-bar timer, or external-provider task selection.
- No admin-web top-bar timer.
- No `.pen` design-file edits as part of this change.
- No broad shell rewrite beyond the shared header affordances needed for user-web parity.

## Decisions

### Keep Timer Orchestration App-Local

`apps/user-web` remains the owner of timer state, current-timer refresh, task-picker data loading, start/stop calls, and running-entry reassignment. `packages/web-shared` provides only header chrome, profile menu behavior, and layout slots.

This avoids moving timer API behavior into a cross-app package that admin-web does not use.

### Make Header Identity Text App-Controlled

The shared `WorkspaceHeader` should support app-controlled identity text visibility. User-web can render an avatar-only trigger, while admin-web can keep visible display/scope text.

This keeps the shared dropdown shell reusable without forcing identical closed-trigger text across apps.

### Support Avatar-Side Center Alignment

The shared header center region should allow user-web's compact timer surface to sit at content width and align toward the avatar/profile side on tablet and desktop. Empty center content and admin-web behavior remain stable.

This preserves shared header ownership while matching the approved user-web top-bar composition.

### Move Timer Actions Into The Popup Flow

The desktop top bar and mobile strip should not render separate visible `Start`, `Stop`, or `Change task` action buttons. The compact surface or mobile opener opens the task-picker popup, and that popup owns visible `Start timer`, `Stop timer`, and task-change confirmation actions.

This matches issue #206 and prevents old `Last tracked task + Start` chrome from reappearing.

### Keep Existing API Contracts

The implementation should continue using current `time-entries`, `projects`, and `tasks` contracts. Running timer reassignment remains an update to the running time entry, and idle start creates a fresh running entry.

## Risks / Trade-offs

- Shared header changes can regress admin-web identity text unless admin behavior is covered by tests.
- Removing shell-visible timer buttons increases reliance on the popup entry point, so accessible names, keyboard activation, and focus return must be verified.
- Mobile profile-dropdown-open variants can hide task metadata if layering is careless; the timer opener and elapsed status must remain usable.
- Existing tests likely assert old top-bar `Start`, `Stop`, and `Change` buttons, so test updates need to distinguish intended behavior from deleted coverage.
- UI docs must remove conflicting accessibility wording about header-visible timer actions before implementation is considered fully aligned.

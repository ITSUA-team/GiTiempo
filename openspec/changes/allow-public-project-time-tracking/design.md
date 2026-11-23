## Context

The saved-task start in `TimeEntriesService.requireTaskForTimerStart` checks a task's GitHub issue reference when deciding whether to require assignment. Managed GitHub starts and the capability endpoint make a separate decision through `isManagedProjectAuthorized`. Today an ordinary member can see a public project and still be denied by either path.

The Admin · Projects frame in `GITiempo.pen` places Select members inside expanded Project settings. The implementation uses `ProjectEditForm.vue` and saves through `useProjectEditActions.ts`. That save handler computes both member-list and explicit project-manager changes using the same assignment records.

## Goals / Non-Goals

Public visibility grants tracking access to each active workspace member. The decision applies to existing local tasks and verified issues first materialized in a public managed project. Private managed projects use existing assignment rules, and private external-reference projects use their existing exact-task participation rules. Scope in admin is the Select members field inside expanded project settings.

## Decisions

### API

In `apps/api/src/time-entries/services/time-entries.service.ts`, evaluate managed tracking permission by current workspace role, project visibility and private-project assignment. Reuse the managed decision across saved starts, GitHub starts and capability. Evaluate external-reference access separately. Perform the final membership, visibility and assignment checks inside the start transaction so a stale positive preflight cannot grant access after a project becomes private. A successful start records time for the caller without creating an assignment.

Retain current workspace isolation, active/open checks, one global timer, billing and source. Starting a saved task uses local authorization. Starting by GitHub issue in a managed project also verifies the installation and issue mapping. The extension and user SPA already consume the API decision. See `apps/api/AGENTS.md`, `apps/chrome-ext/AGENTS.md` and `apps/user-web/AGENTS.md` for verification.

### Admin web

In `apps/admin-web/src/components/forms/ProjectEditForm.vue`, base field visibility on the live form value, initialized from the project. In `apps/admin-web/src/composables/projects/useProjectEditActions.ts`, skip the member-list diff when the submitted visibility is public. Carry valid form values through hidden-field validation. A deliberate Project manager change may still update the corresponding manager assignment independently. Existing assignments are retained for review if the project becomes private later.

Use the existing expanded settings component on desktop and mobile. The requested public state omits the entire labelled control. Refer to `apps/admin-web/AGENTS.md`, the Admin · Projects frame and `docs/ui/pages-admin.md` for the rest of the editor.

## Risks / Trade-offs

A public-project capability decision can become stale before start. Exercise a public-to-private change between those operations. The editor can submit stale member IDs after a visibility toggle. Exercise that case with existing members and a manager to catch accidental removals or additions. No data backfill is required.

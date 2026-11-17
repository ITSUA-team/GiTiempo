# Design

## Context

The admin shell can keep the current route mounted when the destination workspace permits access. Switching updates the session and invalidates scoped server data. Collections held in view-local refs and loaded on mount survive that transition. See [the proposal](proposal.md) for the affected pages.

## Goals / Non-Goals

Make each affected collection and its actions belong to one visit to an authorized workspace. Keep route access decisions in the existing shell and router. The report rows already follow the active scope. Their query keys, fetch budget and retry behavior remain outside this change.

## Decisions

### Admin frontend lifecycle

Follow [the admin app instructions](../../../apps/admin-web/AGENTS.md). Derive the effective scope from the existing `getAdminServerStateScope` helper. Observe its workspace, user and role values individually so token renewal with identical claims preserves local state. Start the initial load and subsequent loads through the same immediate watcher. Invalidate the old visit and clear its data and actions before awaiting destination data. Skip reads when there is no authorized scope.

Capture a per-visit generation for asynchronous work. Check it before starting dependent requests and before committing results, errors, loading flags, navigation or notifications. This also protects a rapid A → B → A sequence where workspace ID alone would match an obsolete request. A mutation already dispatched in A can finish there. Its completion must have no effect on the new visit. A shell-wide keyed remount would also discard unrelated page state and repeat healthy report requests.

### Admin frontend ownership

- **Projects.** In `ProjectsView.vue` and `useAdminProjectsData`, retire the rows, summary, member choices and selected member IDs together. Close expanded edits and confirmations before presenting B's data.
- **Members.** In `MembersView.vue`, reset member and invitation data and their action state at the same boundary. Keep independent loading and error handling in `useWorkspaceMembersData` and `usePendingInvitesData` so either section can finish first.
- **Add Project.** In `AddProjectView.vue`, reset the form's manager field and any GitHub-derived values, parent selection, errors and scan/submit state. Preserve the selected source mode. Give the visible `GitHubProjectFields.vue` a fresh workspace lifetime and guard its asynchronous selection and scan events. Load import metadata only when import mode is visible.
- **Reports.** In `ReportsView.vue` and `useSavedReports`, reset the collection, active ID, comparison baseline, preset dialogs and write state on scope change. Retain existing within-workspace ordering of list and mutation results. Keep report queries on their existing scope and maintain the request budget established by `improve-spa-data-refresh`.

## Risks / Trade-offs

- Independent responses can finish out of order. Verify delayed successes, failures and finalizers with controlled promises across workspace transitions.
- Form components and dialogs can retain IDs after a list is cleared. Exercise actual selection and submission through mounted views and assert the destination never receives a source ID.
- A switch may remove route access. Preserve existing redirects and never start destination reads for an unauthorized page.

## Migration Plan

Deploy and roll back with the admin frontend. The change requires no data migration.

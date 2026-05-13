## Context

The readiness review found a source-of-truth conflict: `docs/ui/layout.md` and approved `GITiempo.pen` screens require icon-only authenticated sidebar navigation, while `openspec/specs/frontend-shared-leaves/spec.md` still requires text-only shared navigation with no per-item icons. The same review found current row-action implementations still render text labels in user/admin tables despite docs and approved screens requiring icon-only row actions.

Affected areas are frontend-only:

- `packages/web-shared`: shared authenticated navigation component and shared management-table action styling or small reusable action leaf.
- `apps/user-web`: app-local navigation item definitions and time-entry row actions.
- `apps/admin-web`: app-local navigation item definitions and members/projects row actions.

No backend/API coordination is required because the change is visual, accessibility, and component-contract work only.

## Goals / Non-Goals

**Goals:**

- Make the OpenSpec requirements agree with UI docs and approved `.pen` designs for icon-only navigation and row actions.
- Keep route ownership, route targets, and active-state decisions app-local while allowing the shared navigation renderer to display icons.
- Preserve label text as tooltip copy and accessible labels for navigation and row action buttons.
- Use documented token styling for active/default/destructive icon states.
- Verify both `user-web` and `admin-web` because the implementation touches shared frontend UI.

**Non-Goals:**

- No API, OpenAPI, contract, database, or backend behavior changes.
- No replacement of page-level primary CTAs such as `+ New time entry`, `+ New task`, `Invite Member`, or create-project actions; this change targets navigation items and table row actions only.
- No new navigation routes or changes to route guard behavior.
- No custom icon system beyond the repo-approved icon approach.

## Decisions

1. Keep shared navigation presentational and app-owned metadata explicit.

   `WorkspaceNavigation` should remain the shared renderer for sidebar/mobile navigation, but each app should continue to own its nav list, route names, optional `to`, and active-state mapping. The nav item contract should add icon metadata supplied by each app rather than importing app route knowledge into `@gitiempo/web-shared`.

   Alternative considered: centralize all nav items and icons inside `@gitiempo/web-shared`. Rejected because app-local route ownership is an existing package-boundary rule and the shared component should not know product route maps.

2. Keep label strings in the data model even when not visually rendered.

   The `label` remains the source for tooltip copy and accessible labeling. This avoids duplicate copy fields for the common case while keeping visible text removed from sidebar/action cells.

   Alternative considered: introduce separate `tooltipLabel` and `ariaLabel` fields immediately. Rejected for MVP because the current docs require former text to be reused for both, and separate copy can be added later only if a concrete exception appears.

3. Prefer a small shared row-action helper/leaf over repeating text-to-icon button markup.

   Time-entry, member, and project row actions share the same behavior: compact icon-only action with tooltip, accessible label, semantic color, and optional loading/disabled state. A small shared helper or component should standardize those details while preserving app-local click handlers and conditional action availability.

   Alternative considered: update each table inline. Rejected because docs define a cross-app standard and duplication would increase drift risk.

4. Use the existing approved icon direction.

   UI docs name Heroicons as the primary custom icon library while the approved `.pen` uses equivalent iconography for dashboard, reports, invoices, members, projects, settings, edit, delete/remove, archive, unarchive, and assign. Implementation should use the repo-approved frontend icon dependency and token classes; PrimeIcons remain only for icons rendered internally by PrimeVue.

   Alternative considered: use PrimeIcons everywhere for convenience. Rejected because docs reserve PrimeIcons for PrimeVue internals.

## Risks / Trade-offs

- Shared package dependency mismatch → `@gitiempo/web-shared` currently does not list `@heroicons/vue`; either add the dependency to the shared package if icons are imported there, or pass icon components from each app so dependency ownership stays app-local.
- Tooltip directive availability → icon-only controls depend on PrimeVue tooltip registration; verify current bootstrap supports the intended tooltip approach in both apps before relying on it.
- Mobile navigation ambiguity → docs say mobile uses shared nav items, while sidebar docs explicitly ban visible labels in sidebar desktop/collapsed layouts. The specs should require icon-only mobile navigation too only where implementation can preserve accessible labels and touch targets.
- Action discoverability → removing visible text can reduce discoverability; mitigate with consistent icons, tooltip copy, accessible labels, and compact but usable hit areas.
- Tests may assert button text → update tests to query accessible labels or test IDs where appropriate instead of visible `Edit`/`Delete` text.

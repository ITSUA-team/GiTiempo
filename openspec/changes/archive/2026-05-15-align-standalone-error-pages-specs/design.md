## Context

The approved UI docs and `GITiempo.pen` screens now treat route-level 403 and 404 pages in `apps/user-web` and `apps/admin-web` as authenticated standalone error surfaces rather than content rendered inside `AppShell` or `AdminAppShell`. The nearest frontend instructions keep route maps and route-level composition app-local, while shared UI leaves such as `RouteErrorPanel` remain eligible for reuse across both SPAs.

This change is spec-only. It does not introduce new API behavior, contracts, or design tokens. Its purpose is to align OpenSpec with the already-approved docs and design so later router and view implementation work can proceed without source-of-truth drift.

## Goals / Non-Goals

**Goals:**
- Clarify that normal authenticated product pages remain shell-owned while route-level 403 and 404 pages are standalone authenticated exceptions.
- Align user and admin routing specs with the documented standalone error-page route behavior.
- Capture the 404 back-action visibility rule so future implementations and tests have an explicit requirement.

**Non-Goals:**
- Changing backend auth, RBAC, or error response semantics.
- Defining new visual design beyond what docs and the approved `.pen` already establish.
- Implementing router, view, or test code in either SPA.

## Decisions

### Keep the change spec-only and cross-capability

The mismatch spans shell behavior, route ownership, and page-entry expectations, so the update touches five existing capabilities: `layout`, `frontend-routing`, `admin-routing`, `user-pages`, and `admin-pages`. This keeps each requirement close to its current ownership instead of forcing a new error-pages capability.

Alternative considered: create a new standalone `error-pages` capability. Rejected because the existing mismatch is primarily about exceptions to current shell-owned routing and page-entry rules, not an independent feature area.

### Treat 403/404 as authenticated route exceptions, not public entry pages

The docs still frame these pages as route-level surfaces reached from authenticated navigation, so the specs should preserve auth-aware routing and redirect behavior while allowing these two routes to render outside the shell.

Alternative considered: define the pages as fully public fallback routes. Rejected because that would change auth behavior rather than align the specs to the approved docs.

### Use browser-history presence as the 404 back-action rule

The docs explicitly say the 404 `Go back` action appears only when the browser history contains a prior entry for the current tab. The specs should mirror that exact wording rather than tightening it to prior in-app navigation.

Alternative considered: require prior in-app route history only. Rejected because that would exceed the already-approved docs.

## Risks / Trade-offs

- [Spec wording overlap across layout, routing, and page specs] -> Keep each spec focused on its domain: shell exception in `layout`, route ownership in routing specs, and page-entry expectations in page specs.
- [Later docs could narrow the history rule to in-app routes only] -> Mirror the currently approved docs exactly so a future behavior change can be proposed explicitly instead of implied.
- [Implementation may still need additional tests or component API changes] -> Leave implementation details out of this change and capture only the behavior required for future router/view work.

## Why

The approved UI docs and `.pen` screens now define route-level 403 and 404 pages in both SPAs as standalone authenticated error surfaces outside the main shell. OpenSpec still describes all authenticated user and admin pages as shell-owned entries, which leaves the routing and page specs behind the approved source of truth.

## What Changes

- Update frontend shell and routing requirements to treat route-level 403 and 404 pages as documented standalone authenticated exceptions instead of shell-owned pages.
- Update user-page and admin-page entry expectations so normal product pages stay shell-owned while route-level 403 and 404 pages may render as standalone authenticated error pages.
- Document the 404 secondary action rule so `Go back` appears only when browser history contains a prior entry for the current tab.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: clarify that the shared shell does not wrap standalone route-level 403 and 404 pages.
- `frontend-routing`: align authenticated user routing rules with standalone 403/404 routes and history-aware 404 back action behavior.
- `admin-routing`: align authenticated admin routing rules with standalone 403/404 routes outside the admin shell.
- `user-pages`: narrow shell-owned entry expectations so they apply to normal member pages, not standalone 403/404 routes.
- `admin-pages`: narrow shell-owned entry expectations so they apply to normal admin pages, not standalone 403/404 routes.

## Impact

- OpenSpec files under `openspec/specs/layout/`, `openspec/specs/frontend-routing/`, `openspec/specs/admin-routing/`, `openspec/specs/user-pages/`, and `openspec/specs/admin-pages/`.
- Future frontend routing and error-page implementation work in `apps/user-web` and `apps/admin-web` will have spec coverage aligned with the already-approved docs and design.

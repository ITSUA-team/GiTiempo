## Why

`apps/admin-web` still boots Vue Router with an empty route list, so the documented admin pages have no formal route inventory or authenticated entry structure. Defining the route map now removes ambiguity for later page work and keeps admin-web aligned with the shared auth and shell direction already established for the web apps.

## What Changes

- Add a new OpenSpec capability for `admin-web` routing, covering route inventory, authenticated shell mounting, and guest-versus-authenticated entry behavior.
- Define the admin-web route map for dashboard, reports, invoices, members, projects, and settings based on the documented UI requirements.
- Establish the route-level structure needed for protected admin pages to mount through the shared shell pattern.
- Align admin-web route behavior with the same frontend auth direction as user-web so later admin auth/bootstrap work has a stable routing target.
- Require implementation under this change to follow the change design and the existing project docs, with the docs remaining the source of truth if implementation details drift.
- Add visible cross-link entry points between `user-web` and `admin-web` in the shared shell/login experience so users can switch workspaces without manually editing the URL.

## Capabilities

### New Capabilities

- `admin-routing`: Defines the `admin-web` route inventory, auth-aware entry rules, and shell-based mounting structure for admin-facing pages.

### Modified Capabilities

- None.

## Impact

- `apps/admin-web/src/main.ts` router bootstrap.
- Future `apps/admin-web/src/router/*` definitions and route guards.
- Future `apps/admin-web/src/views/*` and layout components mounted by the admin route map.
- `openspec/specs/admin-routing/spec.md` as the source of truth for admin-web route behavior.
- Verification against `docs/ui/pages-admin.md`, `docs/ui/layout.md`, `docs/TECHNICAL-REQUIREMENTS.md`, and `apps/admin-web/AGENTS.md` during implementation.
- Follow-up project updates in both SPAs to add the documented cross-link affordances in the shell/login surfaces.

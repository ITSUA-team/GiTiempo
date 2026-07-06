## 1. Context And Design Parity

- [ ] 1.1 Read `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, and the relevant admin Settings UI docs before implementation.
- [ ] 1.2 Inspect the approved `GITiempo.pen` Admin Settings frame and use it as the parity checklist for Settings card spacing, width, typography, and responsive behavior.

## 2. Connection Status Query Layer

- [ ] 2.1 Add an admin settings query key for the current user's GitHub connection status.
- [ ] 2.2 Extend the admin settings client to call `GET /github/connection` and parse `githubConnectionStatusResponseSchema`.
- [ ] 2.3 Add a settings composable that exposes GitHub connection status, loading state, request-error state, and retry behavior for the Settings page.
- [ ] 2.4 Add or update focused tests for the new query key, client call, and composable behavior.

## 3. Settings UI Implementation

- [ ] 3.1 Add a GitHub Account settings card that renders connected, disconnected, loading, and request-error states without exposing token material.
- [ ] 3.2 Update `SettingsView.vue` to load GitHub connection status independently from workspace settings and organization policy data.
- [ ] 3.3 Pass a connected-account gate from `SettingsView.vue` into the GitHub Workspace Access card.
- [ ] 3.4 Update the GitHub Workspace Access card so the `Add organization` setup action is hidden unless the current user is connected to GitHub and organization policy state allows adding.
- [ ] 3.5 Preserve saved organization policy list, empty state, loading state, request-error state, remove behavior, and existing recovery guidance independently from the add-action gate.

## 4. Documentation And Verification

- [ ] 4.1 Update `docs/ui/pages-admin.md` to document the GitHub Account prerequisite section and connection-gated organization setup behavior.
- [ ] 4.2 Update Settings page/component tests for connected, disconnected, loading, and connection-status-error gate states.
- [ ] 4.3 Run `pnpm --filter admin-web typecheck`.
- [ ] 4.4 Run `pnpm --filter admin-web lint`.
- [ ] 4.5 Run the focused admin-web Settings tests covering the changed query, page, and settings components.

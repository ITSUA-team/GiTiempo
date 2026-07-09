## 1. Context And Design Parity

- [x] 1.1 Read `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, and the relevant admin Settings UI docs before implementation.
- [x] 1.2 Inspect the approved `GITiempo.pen` Admin Settings frame when Pencil access is available and use it as the parity checklist for Settings card spacing, width, typography, and responsive behavior.

## 2. Connection Status Query Layer

- [x] 2.1 Add an admin settings query key for the current user's GitHub connection status.
- [x] 2.2 Extend the admin settings client to call `GET /github/connection` and parse `githubConnectionStatusResponseSchema`.
- [x] 2.3 Add a settings composable that exposes GitHub connection status, loading state, request-error state, and retry behavior for the Settings page.
- [x] 2.4 Add or update focused tests for the new query key, client call, and composable behavior.
- [x] 2.5 Add an admin settings query key, client method, and query wrapper for `GET /github/organizations` using `githubOwnerListResponseSchema`.

## 3. Setup Organization API Contract

- [x] 3.1 Add `GET /github/organizations` as a setup-only endpoint that lists organization owners visible to the current user's connected GitHub account.
- [x] 3.2 Ensure disconnected users are rejected without calling GitHub provider APIs and without exposing token material.
- [x] 3.3 Keep the setup organization list independent from workspace allow-list filtering while preserving workspace policy enforcement for browsing and add mutations.
- [x] 3.4 Add or update API controller/service tests for the setup organization list behavior.
- [x] 3.5 Update `docs/API-ENDPOINTS.md` and `packages/shared/openapi.json` for the new route.

## 4. Settings UI Implementation

- [x] 4.1 Add a GitHub Account settings card that renders connected, disconnected, loading, and request-error states without exposing token material.
- [x] 4.2 Update `SettingsView.vue` to load GitHub connection status independently from workspace settings and organization policy data.
- [x] 4.3 Pass a connected-account gate from `SettingsView.vue` into the GitHub Workspace Access card.
- [x] 4.4 Update the GitHub Workspace Access card so the `Add organization` setup action is hidden unless the current user is connected to GitHub and organization policy state allows adding.
- [x] 4.5 Render the add setup input as a PrimeVue organization selector populated from available connected-account organizations, excluding already allowed workspace organizations from suggestions while still accepting manually typed organization logins.
- [x] 4.6 Preserve saved organization policy list, empty state, loading state, request-error state, remove behavior, and existing recovery guidance independently from the add-action gate.
- [x] 4.7 Keep backend `POST /workspace/github/organizations` validation authoritative for disconnected, unavailable, or stale GitHub provider states.

## 5. Documentation And Verification

- [x] 5.1 Update `docs/ui/pages-admin.md` to document the GitHub Account prerequisite section, selector source, and connection-gated organization setup behavior.
- [x] 5.2 Update Settings page/component tests for connected, disconnected, loading, connection-status-error, selector loading/error/empty, already-allowed filtering, and manually typed organization fallback states.
- [x] 5.3 Add an `admin-pages` OpenSpec delta so the existing Settings GitHub Workspace Access scenarios no longer require an always-available add form.
- [x] 5.4 Run `pnpm --filter admin-web typecheck`.
- [x] 5.5 Run `pnpm --filter admin-web lint`.
- [x] 5.6 Run the focused admin-web Settings tests covering the changed query, page, and settings components.
- [x] 5.7 Run focused API tests for `GET /github/organizations` and disconnected organization add behavior.
- [x] 5.8 Run `pnpm exec openspec status --change "add-github-account-settings-gate-organization-setup"`.

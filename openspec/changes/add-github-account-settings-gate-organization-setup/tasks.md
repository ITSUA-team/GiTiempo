## 1. Frontend Context And Data Access

- [ ] 1.1 Open the approved `GITiempo.pen` Settings screen when Pencil access is available and build a parity checklist against `docs/ui/pages-admin.md` before editing UI.
- [ ] 1.2 Add an admin Settings client method for `GET /github/connection` using the shared `githubConnectionStatusResponseSchema` and existing authenticated API client.
- [ ] 1.3 Ensure `packages/shared` exports the GitHub connection response schema and types needed by admin-web; add only minimal package exports if they are missing.
- [ ] 1.4 Add a scoped admin Settings query key and Vue Query wrapper for GitHub connection status.

## 2. Settings GitHub Card Behavior

- [ ] 2.1 Add Settings page state for GitHub connection status with independent loading, error, retry, connected, and disconnected states.
- [ ] 2.2 Pass GitHub account status into `SettingsGitHubWorkspaceAccessCard` without coupling it to workspace organization policy list loading.
- [ ] 2.3 Render a GitHub account section in the card that shows safe connected account metadata when connected.
- [ ] 2.4 Render disconnected copy and a connect or reconnect action to the user profile GitHub connection surface when GitHub is disconnected.
- [ ] 2.5 Hide the `Add organization` section unless GitHub connection status is loaded as connected.
- [ ] 2.6 Keep allowed-organization empty, populated, request-error, and remove-action states visible and usable while GitHub is disconnected.
- [ ] 2.7 Preserve existing GitHub App recovery checklist rendering and retry behavior after a connected admin attempts to add an organization.

## 3. Backend And Contract Parity

- [ ] 3.1 Verify `GET /github/connection` accepts admin-web authenticated requests and returns only the existing safe connected/disconnected response shape.
- [ ] 3.2 Verify `POST /workspace/github/organizations` rejects disconnected or unusable GitHub accounts without saving a policy row or exposing token material.
- [ ] 3.3 Add or adjust API/contract tests only if the existing backend behavior does not already cover the disconnected add prerequisite and safe recovery payloads.
- [ ] 3.4 Update endpoint or UI docs only if implementation changes a public contract or documented Settings behavior beyond this OpenSpec delta.

## 4. Tests And Verification

- [ ] 4.1 Add component tests for `SettingsGitHubWorkspaceAccessCard` connected, disconnected, account-loading, and account-error states.
- [ ] 4.2 Add Settings view tests proving disconnected admins do not see `Add organization`, connected admins do, and saved organizations remain visible/removable while disconnected.
- [ ] 4.3 Add client/query tests for the GitHub connection status request and schema parsing.
- [ ] 4.4 Run `pnpm --filter admin-web test`.
- [ ] 4.5 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [ ] 4.6 If `packages/shared` changes, run `pnpm --filter @gitiempo/shared build` and the affected admin-web verification again.
- [ ] 4.7 If `apps/api` changes, run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- [ ] 4.8 Run `pnpm exec openspec status --change "add-github-account-settings-gate-organization-setup"`.

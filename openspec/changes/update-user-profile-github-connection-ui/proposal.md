## Why

The user Profile page currently renders a static GitHub connection card that does not consume the implemented GitHub connection API or match the approved Profile design. Updating this page now aligns the user-web UI with the shared API contract, documented state model, and approved `.pen` design before GitHub-backed workflows depend on the connection state.

## What Changes

- Replace the static GitHub connection card with API-backed state from `GET /github/connection`.
- Add GitHub connection actions for refresh, connect/reconnect, and disconnect using the implemented API endpoints.
- Render the documented states only: loading, request-error, disconnected, connected, and redirecting/connecting.
- Show connected account fields from the current API contract only: `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt`.
- Omit the avatar row when `avatarUrl` is `null`.
- Surface callback outcomes and API failures through standard PrimeVue toast notifications, without inline callback banners.
- Use standard PrimeVue `ConfirmDialog` for disconnect confirmation and existing design-token/PrimeVue component conventions.
- Keep the Profile page display-name surface aligned with the approved design and existing `PATCH /users/me` capability if implementation scope includes editable profile details.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Define API-backed Profile page GitHub connection behavior, state rendering, actions, callback toasts, and connected-account field rules.

## Impact

- `apps/user-web/src/views/ProfileView.vue` or extracted Profile page feature components/composable.
- App-local GitHub connection client under `apps/user-web/src/services/` using `@gitiempo/web-shared/http` request conventions and shared Zod response schemas.
- Focused user-web tests for fetch-boundary behavior and Profile page/composable state transitions.
- No backend API or shared contract shape changes are expected.
- No custom dialog or toast designs are introduced; existing PrimeVue services/components are used.

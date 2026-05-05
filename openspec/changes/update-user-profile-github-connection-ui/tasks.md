## 1A. GitHub Connection Client

- [ ] 1.1 Add an app-local user-web GitHub connection client that calls `GET /github/connection`, `GET /github/auth-url`, and `DELETE /github/connection` with bearer auth.
- [ ] 1.2 Parse GitHub connection and auth-url responses with shared schemas from `@gitiempo/shared` and `requestJson` from `@gitiempo/web-shared/http`.
- [ ] 1.3 Add fetch-boundary tests covering request paths, auth headers, response parsing, and API error propagation for the GitHub client.

## 1B. Profile Identity Boundary

- [ ] 1.4 Extend the existing current-user client/runtime boundary to support `PATCH /users/me` without introducing a second overlapping `/users/me` client surface.
- [ ] 1.5 Parse the profile update request with the shared `updateUserSchema` contract and keep authoritative current-user response parsing in the current-user boundary.
- [ ] 1.6 Add fetch-boundary tests covering the `PATCH /users/me` request path, auth headers, payload shape, response parsing, and API error propagation.


## 2. Profile GitHub State Logic

- [ ] 2.1 Add a focused composable or feature surface for Profile GitHub connection state using the auth store access token.
- [ ] 2.2 Implement loading, request-error, disconnected, connected, and redirecting/connecting states without collapsing request failures into disconnected.
- [ ] 2.3 Handle `/profile` GitHub callback query outcomes with standard PrimeVue toast notifications and remove handled query parameters with router replacement.
- [ ] 2.4 Implement connect/reconnect by requesting the authorization URL, rendering connecting state while pending, and navigating to the returned URL on success.
- [ ] 2.5 Implement disconnect with standard PrimeVue confirmation, API mutation, success/error toast feedback, and authoritative status refresh or state update.

## 3. Profile View UI

- [ ] 3.1 Replace the static GitHub connection card in `ProfileView.vue` with the API-backed GitHub connection surface matching the approved `.pen` design.
- [ ] 3.2 Render connected account fields as `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt` only.
- [ ] 3.3 Omit the avatar row entirely when `avatarUrl` is `null`; do not render initials or a custom placeholder for the GitHub avatar.
- [ ] 3.4 Use PrimeVue `Tag`, `Avatar`, `Skeleton`, `Button`, `ConfirmDialog`, and existing toast service patterns instead of custom equivalents.
- [ ] 3.5 Implement the editable display-name form with enabled input, dirty-state Save/Cancel behavior, and `PATCH /users/me` integration while preserving existing auth behavior.

## 4. Tests And Verification

- [ ] 4.1 Add focused tests for Profile GitHub state transitions: loading, request-error, disconnected, connected, and redirecting/connecting.
- [ ] 4.2 Add tests for connect/reconnect success and failure, disconnect confirmation success and failure, callback success/error toast handling, callback-success-followed-by-fetch-failure handling, query cleanup, and null-avatar row omission.
- [ ] 4.2C Add at least one focused Profile view or feature-integration test that proves route-view wiring for the assembled identity surface, GitHub connection surface, and sign-out action.
- [ ] 4.3 Run `pnpm --filter user-web lint` and fix any newly introduced warnings.
- [ ] 4.4 Run `pnpm --filter user-web typecheck` and fix any type errors.

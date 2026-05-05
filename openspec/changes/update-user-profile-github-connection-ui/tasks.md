## 1A. GitHub Connection Client

- [x] 1.1 Add an app-local user-web GitHub connection client that calls `GET /github/connection`, `GET /github/auth-url`, and `DELETE /github/connection` with bearer auth.
- [x] 1.2 Parse GitHub connection and auth-url responses with shared schemas from `@gitiempo/shared` and `requestJson` from `@gitiempo/web-shared/http`.
- [x] 1.3 Add fetch-boundary tests covering request paths, auth headers, response parsing, and API error propagation for the GitHub client.

## 1B. Profile Identity Boundary

- [x] 1.4 Extend the existing current-user client/runtime boundary to support `PATCH /users/me` without introducing a second overlapping `/users/me` client surface.
- [x] 1.5 Parse the profile update request with the shared `updateUserSchema` contract and keep authoritative current-user response parsing in the current-user boundary.
- [x] 1.6 Add fetch-boundary tests covering the `PATCH /users/me` request path, auth headers, payload shape, response parsing, and API error propagation.


## 2. Profile GitHub State Logic

- [x] 2.1 Add a focused composable or feature surface for Profile GitHub connection state using the auth store access token.
- [x] 2.2 Implement loading, request-error, disconnected, connected, and redirecting/connecting states without collapsing request failures into disconnected.
- [x] 2.3 Handle `/profile` GitHub callback query outcomes with standard PrimeVue toast notifications and remove handled query parameters with router replacement.
- [x] 2.4 Implement connect/reconnect by requesting the authorization URL, rendering connecting state while pending, and navigating to the returned URL on success.
- [x] 2.5 Implement disconnect with standard PrimeVue confirmation, API mutation, success/error toast feedback, and authoritative status refresh or state update.

## 3. Profile View UI

- [x] 3.1 Replace the static GitHub connection card in `ProfileView.vue` with the API-backed GitHub connection surface matching the approved `.pen` design.
- [x] 3.2 Render connected account fields as `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt` only.
- [x] 3.3 Omit the avatar row entirely when `avatarUrl` is `null`; do not render initials or a custom placeholder for the GitHub avatar.
- [x] 3.4 Use PrimeVue `Tag`, `Avatar`, `Skeleton`, `Button`, `ConfirmDialog`, and existing toast service patterns instead of custom equivalents.
- [x] 3.4A Keep the rendered `<ConfirmDialog>` host at the route, page-shell, or app-shell level instead of inside the GitHub card component.
- [x] 3.4B Reuse the documented/app-local page-header pattern for the Profile route instead of introducing another one-off title/subtitle block.
- [x] 3.5 Implement the editable display-name form with enabled input, dirty-state Save/Cancel behavior, and `PATCH /users/me` integration while preserving existing auth behavior.

## 4. Tests And Verification

- [x] 4.1 Add focused tests for Profile GitHub state transitions: loading, request-error, disconnected, connected, and redirecting/connecting.
- [x] 4.2 Add tests for connect/reconnect success and failure, disconnect confirmation success and failure, callback success/error toast handling, callback-success-followed-by-fetch-failure handling, query cleanup, and null-avatar row omission.
- [x] 4.2C Add at least one focused Profile view or feature-integration test that proves route-view wiring for the assembled identity surface, GitHub connection surface, and sign-out action.
- [x] 4.3 Run `pnpm --filter user-web lint` and fix any newly introduced warnings.
- [x] 4.4 Run `pnpm --filter user-web typecheck` and fix any type errors.
- [x] 4.5 Because this change extends `packages/web-shared` auth/runtime helpers, run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck` too.
- [x] 4.6 Because this change touches shared auth/runtime behavior used by both SPAs, run `pnpm --filter user-web test` and `pnpm --filter admin-web test` before marking the change complete.

## 5. Frontend DOM Follow-up

- [x] 5.1 Prevent unsaved Profile display-name input from being overwritten by unrelated `authStore.profile` refreshes while the form is dirty.
- [x] 5.2 Extract the repeated user-web surface card shell DOM into a small app-local reusable wrapper instead of leaving new one-off `border-divider bg-surface shadow-card rounded-lg border ...` sections inline.
- [x] 5.3 Render the connected GitHub account metadata rows with a semantic label/value structure (for example `<dl>/<dt>/<dd>`) while preserving the approved visual layout.
- [x] 5.4 Do not ship an undocumented connecting-state `Cancel` action in the Profile GitHub DOM.

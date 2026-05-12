## Context

The user-web Profile page currently contains static GitHub connection markup that does not call `GET /github/connection`, does not use the implemented `GET /github/auth-url` and `DELETE /github/connection` actions, and does not match the approved Profile design in `GITiempo.pen`. The backend and shared contract already expose the needed GitHub connection status shape, so this change is frontend implementation work scoped to `apps/user-web` plus focused app-local tests.

The applicable app rules are in `apps/user-web/AGENTS.md`: use the UI docs first, match the approved `.pen` design, keep route views from becoming mixed orchestration/UI components, and verify with `pnpm --filter user-web lint && pnpm --filter user-web typecheck`. Because this change also extends `packages/web-shared` auth/runtime helpers used by both SPAs, completion must additionally include matching `admin-web` verification and both app test suites. The page uses PrimeVue v4 and Tailwind token utilities, and standard dialog/toast behavior comes from the already-installed PrimeVue `ConfirmationService` and `ToastService`.

## Goals / Non-Goals

**Goals:**

- Render the Profile GitHub connection card from the implemented API and shared Zod response schema.
- Render the Profile display-name surface as a real editable form backed by the existing `PATCH /users/me` API.
- Cover only the documented page states: loading, request-error, disconnected, connected, and redirecting/connecting.
- Display connected account data using the current API contract fields only.
- Omit the avatar row when `avatarUrl` is `null`.
- Use standard PrimeVue `Tag`, `Avatar`, `Skeleton`, `Button`, `ConfirmDialog`, and `Toast` patterns rather than custom equivalents.
- Keep the route view manageable by extracting Profile GitHub state/action orchestration into a composable or focused feature component if the page would otherwise become too large.

**Non-Goals:**

- No backend endpoint or shared contract shape changes.
- No custom dialog/toast designs in `.pen` or implementation.
- No GitHub organization/repository/issue browsing on the Profile page.
- No changes to the timer page GitHub data-selector scope.
- No shared cross-app GitHub UI extraction unless a second stable call site exists.

## Decisions

1. Add an app-local GitHub connection client under `apps/user-web/src/services/`.

   Rationale: this behavior is currently user-web specific and does not yet have two SPA call sites. The client should reuse `@gitiempo/web-shared/http` `requestJson` conventions and shared schemas from `@gitiempo/shared` so request headers, error parsing, and response validation stay aligned with the existing timer-page client pattern.

   Alternative considered: put the client in `packages/web-shared`. That is premature until admin-web has the same stable GitHub connection use case.

   Boundary constraint: this client owns GitHub connection endpoints only. Current-user identity reads and writes should continue to use the existing current-user/auth boundary instead of introducing a second overlapping `/users/me` client surface inside the Profile feature.

2. Keep profile GitHub orchestration out of a large route-view template.

   Rationale: `ProfileView.vue` already contains profile identity, GitHub connection, and sign-out sections. API state, callback query handling, confirmation, toasts, and redirect behavior would make the route view too stateful if implemented inline. A focused composable and/or small Profile GitHub component keeps state transitions testable.

   Alternative considered: implement all behavior directly in `ProfileView.vue`. That would be smaller initially but creates a mixed orchestration/UI component and makes focused testing harder.

    Boundary constraint: the GitHub connection flow and the editable profile-identity form are separate feature surfaces. Future updates should avoid combining them in one broad composable unless they share the same endpoint/state lifecycle for a concrete reason.

3. Treat the editable display-name surface as shipped behavior, not a static design placeholder.

   Rationale: the approved `.pen` design includes Save and Cancel controls, but the source of truth for this change requires an actual editable Profile identity surface. A disabled input or permanently disabled action row does not satisfy the spec and must remain incomplete in tasks until `PATCH /users/me` behavior ships.

   Boundary constraint: if the identity form is left read-only in any intermediate step, the change artifacts must keep the relevant tasks unchecked and must not describe the surface as implemented.

4. Use `window.location.assign(authorizationUrl)` for GitHub OAuth navigation after `GET /github/auth-url` succeeds.

   Rationale: the backend returns a full provider authorization URL and the flow intentionally leaves the SPA. The connecting state should be rendered while the request is in flight and before navigation occurs.

   Connecting-state action constraint: the connecting state does not introduce a `Cancel` action. The request is expected to resolve quickly into browser navigation or an error that returns the card to a retryable state, so an extra transient cancel CTA would be an undocumented one-off action.

   Alternative considered: Vue Router navigation. That is not appropriate for an external GitHub URL.

5. Treat callback query outcomes as transient toast-only feedback.

    Rationale: docs require callback outcomes after redirect back to `/profile` to use toast notifications only and avoid inline success/error banners. After showing the toast, the page should remove the callback query parameters with router replacement so reloads do not repeat the toast.

    Callback contract: the frontend must treat `github` as the callback outcome key. Supported values are `connected` and `error`. When `github=error`, the page must always treat the callback as an error-toast outcome. If the backend also supplies a safe `code` query key and that value is a known safe enum such as `invalid_state`, `github_exchange_failed`, or `github_config`, the page may show nicer copy for that known code. Unknown `code` values must still produce a generic GitHub error toast rather than being ignored. Unknown `github` values remain unsupported callback outcomes and should not trigger callback toasts.

    Alternative considered: show an inline banner in the GitHub card. That conflicts with the docs and approved design.

6. Confirm disconnect through PrimeVue `ConfirmDialog` before calling `DELETE /github/connection`.

   Rationale: disconnect is destructive and docs require the shared confirmation pattern. On success, show a success toast and then refresh `GET /github/connection` so the card settles from authoritative server state; on failure, keep the previous state and show an error toast.

   Alternative considered: inline confirmation inside the card. That would introduce a custom pattern outside the docs.

   Boundary constraint: the card may trigger confirmation through emits or a composable, but the shared PrimeVue host surface for `<ConfirmDialog>` should stay page- or app-scoped rather than being hidden inside a leaf presentational card.

7. Reuse the documented page-header structure instead of introducing another route-local variant.

   Rationale: the user-web docs already define a stable page-header DOM pattern for route views. Leaving each screen to rebuild that header ad hoc creates agent-introduced one-off markup and makes future design parity reviews noisier.

   Alternative considered: keep the Profile header inline because the markup is small. That is acceptable for a single throwaway surface, but this app already has multiple route views with the same title/subtitle block.

   Boundary constraint: reuse can stay app-local. This change does not require cross-app extraction, but it should not add a fresh route-local header variant when the same app already renders the documented pattern elsewhere.

## Risks / Trade-offs

- API status fetch fails during initial page load -> render the request-error card and show an error toast without collapsing into disconnected.
- OAuth redirect succeeds but profile refresh fails -> show callback toast, then independently show request-error state for the connection fetch.
- Query toast repeats on page reload -> remove handled query parameters via router replacement after showing the callback toast.
- `avatarUrl` is `null` -> omit the avatar row entirely so UI does not imply a placeholder source that the API did not provide.
- User disconnects while another tab reconnects -> rely on refreshed `GET /github/connection` after successful disconnect to render the authoritative server state.

## Design Parity Review

- Reviewed against the approved `Profile` screen in `GITiempo.pen`.
- Expected route structure is present in implementation: shared page header, identity card, distinct GitHub connection states, and sign-out action.
- No PrimeVue-only implementation compromises were identified for this change.

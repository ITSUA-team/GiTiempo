## Context

The user-web Profile page currently contains static GitHub connection markup that does not call `GET /github/connection`, does not use the implemented `GET /github/auth-url` and `DELETE /github/connection` actions, and does not match the approved Profile design in `GITiempo.pen`. The backend and shared contract already expose the needed GitHub connection status shape, so this change is frontend implementation work scoped to `apps/user-web` plus focused app-local tests.

The applicable app rules are in `apps/user-web/AGENTS.md`: use the UI docs first, match the approved `.pen` design, keep route views from becoming mixed orchestration/UI components, and verify with `pnpm --filter user-web lint && pnpm --filter user-web typecheck`. The page uses PrimeVue v4 and Tailwind token utilities, and standard dialog/toast behavior comes from the already-installed PrimeVue `ConfirmationService` and `ToastService`.

## Goals / Non-Goals

**Goals:**

- Render the Profile GitHub connection card from the implemented API and shared Zod response schema.
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

2. Keep profile GitHub orchestration out of a large route-view template.

   Rationale: `ProfileView.vue` already contains profile identity, GitHub connection, and sign-out sections. API state, callback query handling, confirmation, toasts, and redirect behavior would make the route view too stateful if implemented inline. A focused composable and/or small Profile GitHub component keeps state transitions testable.

   Alternative considered: implement all behavior directly in `ProfileView.vue`. That would be smaller initially but creates a mixed orchestration/UI component and makes focused testing harder.

3. Use `window.location.assign(authorizationUrl)` for GitHub OAuth navigation after `GET /github/auth-url` succeeds.

   Rationale: the backend returns a full provider authorization URL and the flow intentionally leaves the SPA. The connecting state should be rendered while the request is in flight and before navigation occurs.

   Alternative considered: Vue Router navigation. That is not appropriate for an external GitHub URL.

4. Treat callback query outcomes as transient toast-only feedback.

   Rationale: docs require callback outcomes after redirect back to `/profile` to use toast notifications only and avoid inline success/error banners. After showing the toast, the page should remove the callback query parameters with router replacement so reloads do not repeat the toast.

   Alternative considered: show an inline banner in the GitHub card. That conflicts with the docs and approved design.

5. Confirm disconnect through PrimeVue `ConfirmDialog` before calling `DELETE /github/connection`.

   Rationale: disconnect is destructive and docs require the shared confirmation pattern. On success, refresh or locally transition the card to disconnected and show a success toast; on failure, keep the previous state and show an error toast.

   Alternative considered: inline confirmation inside the card. That would introduce a custom pattern outside the docs.

## Risks / Trade-offs

- API status fetch fails during initial page load -> render the request-error card and show an error toast without collapsing into disconnected.
- OAuth redirect succeeds but profile refresh fails -> show callback toast, then independently show request-error state for the connection fetch.
- Query toast repeats on page reload -> remove handled query parameters via router replacement after showing the callback toast.
- `avatarUrl` is `null` -> omit the avatar row entirely so UI does not imply a placeholder source that the API did not provide.
- User disconnects while another tab reconnects -> rely on refreshed `GET /github/connection` after mutations to render the authoritative server state.

## Context

Three sign-in paths exist today, and they split across two architectures.

Email/password and Google are **Firebase-owned**: `apps/chrome-ext/src/lib/firebase.ts` obtains a Firebase ID token — Google through `chrome.identity.launchWebAuthFlow` against Google's authorization endpoint, then `signInWithCredential` — and `lib/api.ts` exchanges it at `POST /auth/login`. The extension already carries `firebase/auth`, the `identity` permission, and an `oauth2.client_id` in its generated manifest.

GitHub is **backend-owned** and Firebase-free: `AuthGithubService` builds the authorization URL, exchanges the code server-side with a dedicated identity-only OAuth App, reads the primary verified email, and redirects the browser to a SPA route with an **opaque single-use handoff code** whose email is held server-side for 60 seconds. The SPA posts that code to `POST /auth/github/session` and receives the normal token pair. The state is a purpose-scoped JWT bound to the initiating browser through an HttpOnly `gh_oauth_state` nonce cookie.

The only structural reason the extension cannot use the GitHub path is the last hop: `spaRedirect()` resolves its base from `USER_SPA_URL` or `ADMIN_SPA_URL`, and `GithubLoginApp` is `'user' | 'admin'`, with the controller collapsing every other value to `'user'`. An extension needs the browser returned to `https://<extension-id>.chromiumapp.org/`, which is what `chrome.identity.launchWebAuthFlow` watches for.

Two constraints shape everything below. `apps/chrome-ext/AGENTS.md` restricts the extension to Manifest V3, Tailwind-only UI, and shared imports limited to browser-safe contract and token surfaces, and names the approved `GITiempo.pen` extension frames as the source of truth for visual requirements. `apps/api/AGENTS.md` requires regenerating `packages/shared/openapi.json` whenever request or response shapes change.

## Goals / Non-Goals

**Goals:**

- Let a member who authenticates with GitHub sign in to the extension, reaching the same token pair the other two paths produce.
- Reuse the existing handoff mechanics end to end: same start endpoint, same opaque code, same `POST /auth/github/session`, same storage module.
- Keep the extension's authorization window able to **resolve on every outcome**, success or failure.
- Keep the redirect destination un-influenceable by the caller.

**Non-Goals:**

- Changing Google or email sign-in, or removing `firebase/auth` from the extension. That consolidation is attractive but is a separate change with its own risk surface.
- Provisioning users through GitHub. Sign-in stays login-only, as `AuthService.createSessionForVerifiedEmail` already enforces.
- Any admin-side extension surface, GitHub **App** integration, or `github_connections` involvement.
- New session storage, new token claims, or a database migration.

## Decisions

### D1: The extension is a third login target on the existing flow, not a second flow

`GithubLoginApp` becomes `'user' | 'admin' | 'extension'`, and `spaRedirect()` resolves the `extension` base from configuration. `GET /auth/github/start?app=extension` and `GET /auth/github/callback` are otherwise unchanged, and the GitHub OAuth App's registered authorization callback stays `<APP_URL>/auth/github/callback`.

- *Rationale*: the client secret must stay server-side, so the code exchange cannot move into the extension regardless. Given that, adding a redirect target is a handful of lines, while a parallel extension-owned flow would duplicate state signing, email verification, and handoff issuance — and would need a second GitHub OAuth App, because an OAuth App's callback URL cannot also be `chromiumapp.org`.
- *Alternative rejected*: a dedicated OAuth App with `https://<extension-id>.chromiumapp.org/` as its callback, exchanging the code through a new backend endpoint. It doubles the credentials to provision and rotate, and every hardening already built for the SPA flow would have to be re-implemented or deliberately skipped.
- *Alternative rejected*: having the extension open the SPA login and receive the session from the page via `externally_connectable`. It makes the extension's session depend on SPA internals and widens the extension's trust boundary to a web origin.

### D2: The controller stops collapsing unknown targets to `user`

`app === 'admin' ? 'admin' : 'user'` becomes an explicit match against the known set, with `user` as the fallback for absent or unrecognized values.

- *Rationale*: with two targets a defaulting ternary was harmless. With three, a typo like `app=extenson` would silently deliver a handoff code to the web app, where the extension's auth window never sees it and the user watches a window that does nothing. An explicit set turns that into the ordinary `user` path.

### D3: The redirect base comes from configuration, never from the request

A new API setting, `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL`, holds the extension's redirect URL. The extension sends no redirect parameter, and `requireConfig` fails loud with the existing `ServiceUnavailableException` when the flow is used unset.

- *Rationale*: the handoff code is the one credential in this flow that travels through a URL. A caller-supplied redirect would let anyone who can reach `/auth/github/start` have a code delivered to a host they control — an exfiltration primitive, and the reason RFC 9700 §4.1 insists on exact-match registered redirect URIs. Configuration is already the trust boundary for `USER_SPA_URL` and `ADMIN_SPA_URL`, so this adds no new class of trust.
- *Alternative rejected*: accepting `chrome.identity.getRedirectURL()` from the extension and validating it against a `chromiumapp.org` suffix. Any extension in any browser can produce such a URL, so the check would admit every extension rather than ours.
- *Alternative rejected*: deriving the URL from an `EXTENSION_ID` setting. It saves the operator nothing and hard-codes the `chromiumapp.org` shape into the backend, which then cannot be pointed at a local harness.
- *Note*: unlike `USER_SPA_URL`, this setting takes **no localhost default**, following the reasoning already recorded for `ADMIN_SPA_URL` — a stale default would silently misroute a handoff code rather than fail.

### D4: Failures return to the extension, not to the web login page

For the `extension` target, `completeCallback` sends denial, state, email, and exchange failures to the configured extension URL with a `githubError` indicator, rather than to `${SPA}/login`.

- *Rationale*: this is a correctness requirement, not a nicety. `launchWebAuthFlow` resolves only when the navigation reaches its redirect URL; a redirect to the web login page leaves the extension's promise pending and the auth window sitting on a page the user did not ask for, until they close it manually. `resolveStateApp` already reads the target from the signed state on the failure path precisely so a denial returns to the app that started it — the extension is the same case.
- *Consequence*: `resolveStateApp`'s fallback stays `user`. An unverifiable state cannot be attributed to the extension, so that flow ends in a window the extension never sees; the popup surfaces it as a cancellation when the window closes. Acceptable, because an unverifiable state means the value was absent or tampered with.

### D5: Bind the extension's transaction to its initiator, and settle **how** before building

The SPA flow binds a transaction to one browser with an HttpOnly `SameSite=Lax` nonce cookie, so a state authorized in one browser cannot mint a session in another (RFC 9700 §4.7.1). Whether that mechanism survives `launchWebAuthFlow` is **not something to assume**: the auth window's cookie behavior has varied across Chrome versions, and if its jar is partitioned from the profile, `verifyBoundState` rejects every extension sign-in with a state error.

The design therefore fixes the property and makes the mechanism the first implementation step:

- ~~**Primary** — reuse the cookie binding unchanged.~~ **Ruled out by measurement.** A real extension against a real API produced `githubError=state` on every attempt: `/start` returned 302, the callback returned 302 in **4 ms** — too fast for the GitHub token exchange, so it bailed at `verifyBoundState`. The state itself decoded correctly (`app: extension`, `nonceHash` present, unexpired), leaving the missing cookie as the only explanation. Chrome's authorization window does not carry `gh_oauth_state` through to the callback.
- **Contingency — adopted.** The extension generates a random verifier, sends `challenge = SHA256(verifier)` on the start URL, the backend signs the challenge into the state and carries it onto the handoff entry, and `POST /auth/github/session` accepts a `verifier` that must hash to it in constant time. This is the PKCE shape RFC 9700 prescribes for public clients.

Consequences of adopting it, all additive:

- `githubSessionRequestSchema` gains an optional `verifier`, so web clients are unaffected and stay bound by their cookie. A handoff **with** a challenge cannot be redeemed without the matching verifier, so the binding cannot be dropped by omitting the field.
- `startAuthorization` **refuses** the extension target without a well-formed challenge. Were it optional, an unbound extension transaction would be possible, which is the whole property being protected.
- A wrong verifier consumes the code rather than leaving it available for another guess — one attempt, not a guessing oracle.
- `verifyBoundState` skips the cookie check for the extension target only, and demands a challenge claim in its place. The binding is moved, not removed.

- *Rationale for spiking rather than choosing now*: the two branches differ by a shared contract change and a regenerated OpenAPI snapshot. Building either on an assumption risks discarding real work, and a five-minute manual check in a loaded extension settles it.
- *Note*: the extension-owned redirect URI already blocks the classic login-CSRF path, because a handoff code can only be delivered to the extension that owns the ID. The binding is defence in depth, and dropping it silently for one target would be an asymmetry a reviewer should reject.

### D6: One extension flag, matching the SPA convention

`VITE_EXTENSION_GITHUB_SIGNIN_ENABLED` gates the button, default off, shown only on a strict `'true'`.

- *Rationale*: the extension cannot detect whether the API has `GITHUB_SIGNIN_CLIENT_ID`/`_SECRET` and the redirect URL configured, and a button that opens a window ending in `githubError=state` is worse than no button. This mirrors `VITE_GITHUB_SIGNIN_ENABLED` exactly, so the pattern is already familiar in this repository.
- *Trade-off, stated plainly*: this repository has taken deliberate steps to stop accumulating settings that do nothing. This one does something on every build, and it is one variable, not a family. The alternative — a public `GET /auth/github/availability` endpoint the popup consults — trades a build-time constant for a runtime request and a new public endpoint, which is a worse deal for a boolean that changes once per environment.

### D7: The popup's authorization state is drawn before it is coded

The `Ext Unauthenticated` frame in `GITiempo.pen` gains the GitHub action, and that frame is approved before any popup markup changes.

- *Rationale*: `apps/chrome-ext/AGENTS.md` names the approved `.pen` extension frames as the source of truth for visual requirements, and the state currently holds a primary Google action, a secondary email toggle, and a collapsible email form. A third action changes the visual hierarchy — which action is primary, and whether two providers sit side by side — and that is a design decision, not a markup one.
- *Note*: `.pen` files are encrypted and only reachable through the Pencil editor, so this step needs the file open. It also cannot be text-merged; the file is currently missing the popup header work `6da0ee2` dropped on `main`, and that gap is worth closing in the same editing session.

## Planned File Changes

**`apps/api`** — verification per `apps/api/AGENTS.md`: `pnpm --filter @gitiempo/api lint typecheck test`, and `pnpm --filter @gitiempo/api openapi:export` only if the contingency in D5 changes a request shape.

- `src/auth/services/auth-github.service.ts`: widen `GithubLoginApp`, resolve the `extension` redirect base, route failures per D4.
- `src/auth/controllers/auth-github.controller.ts`: explicit target parsing (D2); the existing `@ApiQuery` for `app` gains the new enum value.
- `src/config/env.validation.ts`: `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` as an optional URL with no default.
- `.env.example`: the new setting, documented as optional.

**`apps/chrome-ext`** — verification per `apps/chrome-ext/AGENTS.md`: `pnpm --filter chrome-ext typecheck`, `test`, and `build`.

- `src/lib/github-signin.ts` (new): launches `launchWebAuthFlow` against `${apiBaseUrl}/auth/github/start?app=extension`, reads `code` or `githubError` from the resolved redirect URL, and maps each error indicator to recoverable copy. Kept separate from `lib/firebase.ts`, which stays Firebase-only.
- `src/lib/api.ts`: an `exchangeGithubSession(code)` client method alongside `loginWithFirebaseToken`, reusing the existing `tokenPairResponseSchema` parsing and `setStoredSession`.
- `src/lib/config.ts`: `githubSignInEnabled` from the new flag.
- `src/popup/main.ts`: the GitHub action in the unauthenticated state, per the approved frame, with the existing injectable-dependency pattern so the flow stays testable.
- `.env.example`: the new flag.

**`GITiempo.pen`** — the `Ext Unauthenticated` frame, approved before the popup change.

**Docs** — `docs/ui/chrome-ext.md` for the popup's sign-in actions, `docs/deployment.md` for the new API setting.

## Backend / Extension Coordination

The two layers meet at exactly two points, and both are already-shipped endpoints.

1. **Start** — the extension navigates the auth window to an API URL. It contributes only `app=extension`; the redirect destination is the backend's configured value, so the extension needs no knowledge of its own redirect URL beyond what Chrome intercepts. If D5's contingency applies, the extension also contributes `challenge`.
2. **Exchange** — the extension posts the handoff code to `POST /auth/github/session`, unchanged, and receives `TokenPairResponseDto`.

Ordering matters for deployment but not for development: the extension's button is dark until the flag is turned on, and the backend change is inert until a request arrives with `app=extension`. Either side can ship first.

Nothing crosses through `packages/web-shared`, which the extension is forbidden to import. The only shared surface is `packages/shared`'s `tokenPairResponseSchema`, already consumed by `lib/session.ts`.

## Risks / Trade-offs

- **`launchWebAuthFlow` does not share the profile cookie jar** → measured, no longer a risk but a fact the design absorbed: the callback rejected every extension attempt at `verifyBoundState` while the state itself verified. D5's contingency was adopted, so the extension is bound by proof of possession at the session exchange. The residual risk moves with it: two targets are now bound by two mechanisms, so a change to either binding must be checked against both.
- **An unverifiable state strands the auth window** → the fallback target cannot be known when the state cannot be read (D4). The window closing surfaces as a cancellation through `chrome.runtime.lastError`, which the popup already handles for the Google flow.
- **The handoff code is visible in the redirect URL** → it is opaque, single-use, 60-second-lived, and the URL is intercepted by Chrome rather than fetched, so it never reaches a network log. The verified email stays server-side, which is why the handoff was made opaque in the first place.
- **The extension origin belongs in `ALLOWED_ORIGINS`** → already the documented pattern; `deploy/github-environment.staging.example.env` carries `chrome-extension://<extension-id>` today. Keep it, but note it is belt-and-braces rather than a verified prerequisite: the session exchange runs in the extension's service worker against a host already in `host_permissions`, so it is not the CORS path a web page would take. The original wording here claimed the exchange fails without it, which was never verified.
- **The extension ID changes between unpacked development and a published build** → the configured redirect URL is environment-scoped, like the SPA URLs, so development and staging hold different values. Worth stating in `docs/deployment.md` so it is not discovered during a release.
- **Three sign-in actions crowd a fixed-size popup** → the reason D7 puts the frame first rather than appending a button and seeing how it looks.
- **The handoff store is in-memory** → inherited, not introduced. A horizontally scaled API needs a shared store, as `add-github-signin` already records; the extension target adds a second client to that same limitation.

## Migration Plan

No database migration and nothing new persisted. Steps: (1) approve the `.pen` frame; (2) settle D5 with the spike; (3) ship the backend target, inert until requested; (4) set `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` and confirm the extension origin is in `ALLOWED_ORIGINS`; (5) ship the extension with the flag off; (6) verify the round trip against staging, then turn the flag on.

Rollback is the flag: setting `VITE_EXTENSION_GITHUB_SIGNIN_ENABLED=false` and rebuilding removes the action, and clearing the API setting makes the target fail closed with `ServiceUnavailableException`. Existing sessions are unaffected either way, because they are ordinary token pairs indistinguishable from the other paths.

## Open Questions

- Should the popup also offer GitHub when a stored session has expired, or only in the fully unauthenticated state? The expired-session path already returns the user to the unauthenticated state, so this resolves itself unless the design frame says otherwise.
- Once `add-github-signin` archives and a live `github-signin` spec exists, the backend target belongs in that capability. The requirements added here to `chrome-extension` should then be re-homed, and this change's `proposal.md` records why they start where they do.

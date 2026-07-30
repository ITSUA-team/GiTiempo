## Why

The web apps offer three ways in — email/password, Google, and GitHub — but the Chrome extension offers only the first two. A member who signs in to GiTiempo with GitHub has no credential the extension accepts: GitHub sign-in reuses their existing Firebase UID without giving them a password, and their Google account need not match their GitHub identity. For those members the extension is unreachable, which is precisely the audience it was built for — engineers working on GitHub issues.

Closing the gap needs no new identity model. The backend already owns a login-scoped GitHub OAuth flow that ends in an opaque single-use handoff code, and the extension already stores the normal token pair. What is missing is a way for that flow to hand off to the extension instead of a web app.

## What Changes

- Add a **`Continue with GitHub`** action to the extension popup's unauthenticated state, alongside the existing Google and email actions. The popup's authorization state is drawn in `GITiempo.pen` and approved **before** any code is written.
- Teach the backend GitHub sign-in flow a third target. `GET /auth/github/start` accepts `app=extension`, and the callback returns the browser to a **configured extension redirect URL** (`https://<extension-id>.chromiumapp.org/`) carrying the same opaque handoff code, instead of to a SPA route.
- Return **failures to that same extension URL** as query indicators. An extension auth window that never reaches its redirect URL cannot resolve, so a denial or a state error must come back to the extension rather than land on the web login page.
- Add one API setting, `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL`. The redirect target is read from configuration and never from the request, so no caller can point the handoff code at a host of their choosing.
- Add one extension setting, `VITE_EXTENSION_GITHUB_SIGNIN_ENABLED`, mirroring the SPA flag, so the button never appears where the backend cannot complete the flow.
- Exchange the handoff code at the **existing** `POST /auth/github/session` and store the resulting token pair through the existing session module. No new session mechanics, no new storage shape.
- **BREAKING**: none. Google and email sign-in are untouched, the token contract is unchanged, there is no database migration, and an unset redirect setting simply leaves the flow unavailable.

## Capabilities

### New Capabilities

None. This extends an existing authentication surface rather than introducing one.

### Modified Capabilities

- `chrome-extension`: the requirement that the extension authenticates through Firebase and the backend auth exchange broadens to a second, non-Firebase path — GitHub sign-in through the backend handoff — and the popup's documented sign-in actions grow by one.

Deliberately **not** listed: `github-signin`. That capability has no spec under `openspec/specs/` yet; it lives inside the still-open change `add-github-signin`, whose remaining tasks are external OAuth App setup and staging verification. Declaring a delta against a spec that is not live would either invent a base requirement or collide with that change's own spec file when both archive. The backend obligations this change depends on are therefore pinned as requirements of `chrome-extension`, at the same altitude its existing requirement already uses when it references "the existing backend auth exchange". When `add-github-signin` archives, the extension target belongs in the `github-signin` spec, and `design.md` records that follow-up.

## Impact

- **Backend** (`apps/api`): `AuthGithubService` gains `extension` as a login target and resolves its redirect base from configuration; `AuthGithubController` stops collapsing every non-`admin` value to `user`; `env.validation.ts` gains `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL`. `POST /auth/github/session` is reused unchanged.
- **Extension** (`apps/chrome-ext`): popup unauthenticated state, a new GitHub sign-in module launching `chrome.identity.launchWebAuthFlow` against the API start URL, and `lib/config.ts` for the new flag. The `identity` permission and the API host permission the flow needs are already in the generated manifest.
- **Design**: the popup authorization state in `GITiempo.pen` (`Ext Unauthenticated`), approved before implementation.
- **Configuration**: `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` in the API environment, `VITE_EXTENSION_GITHUB_SIGNIN_ENABLED` in the extension build, and the extension origin already present in `ALLOWED_ORIGINS`.
- **Docs**: `docs/ui/chrome-ext.md` for the popup actions, `docs/deployment.md` for the new API setting, and both `.env.example` files.
- **Out of scope**: GitHub sign-in on the admin extension surface (there is none), user provisioning through GitHub, the GitHub **App** integration and `github_connections`, and any change to Google or email sign-in.

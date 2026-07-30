## 1. Design first (blocks all popup work)

- [x] 1.1 Open `GITiempo.pen` in the Pencil editor. The file cannot be read or edited headlessly, and it cannot be text-merged, so all `.pen` work in this change happens in one editing session.
- [x] 1.2 Restore the popup header work `6da0ee2` dropped from `GITiempo.pen` on `main`: re-add the `Ext Home Button` to the `Ext No Timer`, `Ext Running`, and `Ext Error` headers, remove the `Open full workspace in GiTiempo` text link from `Ext No Timer`, and add the user avatar to the `Ext Running` and `Ext Error` headers. No commit in history holds both that design and the login restyle, so this cannot be recovered with git. — Rebuilt as reusable `Ext Home Button` (`dpU0a`, lucide `house` in `$color-brand`) instanced into all three headers, each paired with the avatar inside a new right-side group. Deleting the text link left a lone narrow `Start Timer`, so the two primary actions were set to `fill_container`, which the live spec already required at `openspec/specs/chrome-extension/spec.md:60,78` and the design had never matched.
- [x] 1.3 Draw the GitHub action into the `Ext Unauthenticated` frame and decide the hierarchy of three sign-in actions in a fixed-size popup: which action is primary, whether Google and GitHub sit side by side or stack, and where the email toggle lands. Use the brand marks already established for the web logins. — Resolved by reusing the web components `OAuth Google Button` (`i95ptt`), `OAuth GitHub Button` (`X2UYhO`), and `Auth Divider` (`Cp38L`) rather than inventing popup-only buttons, so the extension inherits the same brand marks. Three tiers: both OAuth actions stacked full-width, then a divider reading `or`, then `Sign in with email` as a brand-coloured text action. **Consequence for implementation**: the shared components read `Continue with …`, so the popup's existing `Sign in with Google` label changes to match, which touches the popup spec literals.
- [ ] 1.4 Get the `Ext Unauthenticated` frame approved before any popup markup changes, per `apps/chrome-ext/AGENTS.md`, which names the approved `.pen` extension frames as the source of truth for visual requirements.
- [x] 1.5 Add `.gitattributes` with `*.pen -merge -diff` so git never again attempts a line merge of an encrypted design file and instead reports a conflict that must be resolved by choosing a side. — Verified with `git check-attr merge diff -- GITiempo.pen`, which now reports both unset.

## 2. Settle the state binding (blocks backend work)

- [x] 2.1 Load the extension unpacked and determine whether `chrome.identity.launchWebAuthFlow` carries the `gh_oauth_state` HttpOnly `SameSite=Lax` cookie set by the start endpoint through to the callback in the targeted Chrome versions. Record the finding in `design.md` under D5. — **Measured: the cookie does NOT survive.** Every attempt returned `githubError=state`; `/start` gave 302 and the callback gave 302 in 4 ms, too fast for the GitHub token exchange, so it bailed at `verifyBoundState`. The state decoded correctly and unexpired, leaving the absent cookie as the only explanation. D5's primary branch is ruled out.
- [x] 2.2 ~~If the cookie survives, adopt D5's primary branch~~ Not applicable: 2.1 ruled it out. Kept for the record rather than deleted, so the decision trail stays readable. Original text: if the cookie survives, adopt D5's primary branch: no new mechanism, the extension target inherits the existing browser binding unchanged. Close out D5 and skip 2.3.
- [x] 2.3 Adopted D5's contingency: the extension sends `challenge = SHA256(verifier)` on the start URL, the backend signs the challenge into the state and carries it onto the handoff entry, and the session endpoint accepts a `verifier` that must hash to it. This adds a `GithubSessionDto` and `packages/shared` contract change, so run the shared package's vitest suite and regenerate `packages/shared/openapi.json`. — Done: shared contract, DTO, service, controller, extension, and both test suites. `startAuthorization` **refuses** the extension target without a well-formed challenge, since an optional one would allow the unbound transaction this exists to prevent. A wrong verifier burns the code, so there is no guessing oracle. Web handoffs stay redeemable without a verifier.

## 3. Backend: the extension login target

- [x] 3.1 Add `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` to `apps/api/src/config/env.validation.ts` as an optional URL with no localhost default, following the reasoning already recorded there for `ADMIN_SPA_URL`, and document it in `apps/api/.env.example` as optional.
- [x] 3.2 Widen `GithubLoginApp` to `'user' | 'admin' | 'extension'` and resolve the extension redirect base from configuration through `requireConfig`, so an unset value fails closed with the existing `ServiceUnavailableException` rather than defaulting. — `spaRedirect` became `appRedirect` over a new `redirectBase`, since the destination is no longer always a SPA. **Design gap found and closed**: `startAuthorization` now resolves the destination up front, because otherwise an unconfigured environment let `/start` send the user to GitHub and only failed at the callback, surfacing a 503 on an API page after they had already authorized.
- [x] 3.3 Replace the controller's `app === 'admin' ? 'admin' : 'user'` with an explicit match against the known targets, keeping `user` as the fallback for absent or unrecognized values, and extend the `app` `@ApiQuery` enum to include `extension`. — Parsing lives beside the type as an exported `parseGithubLoginApp`, so it is unit-testable rather than inline in the handler. `resolveStateApp` now checks the same set, so an `extension` state claim survives verification.
- [x] 3.4 Route the extension target's success redirect to the configured destination carrying the opaque handoff code, with no web app route involved.
- [x] 3.5 Route every extension-target failure — denial, unverifiable or unbound state, no verified primary email, failed code exchange — to the same configured destination with an error indicator, never to a web login page, so the extension's authorization window always reaches a destination it can observe.
- [x] 3.6 Confirm the extension target needs no change to `POST /auth/github/session`, or, if 2.3 applied, extend it there and nowhere else. — Confirmed unchanged under D5's primary branch: `exchangeSession(code)` is target-agnostic. The `app` enum in the OpenAPI snapshot was regenerated, a 4-line delta confined to `/auth/github/start`.

## 4. Backend tests

- [x] 4.1 `auth-github.service.spec.ts`: extension target builds the authorization URL identically to the web targets; success redirects the handoff code to the configured destination; each failure reason redirects to that same destination with its indicator; an unset destination fails closed. — All four failure reasons covered (`denied`, `state`, `email`, `failed`). The fail-closed test also asserts the web targets stay usable, so the new setting gates only the extension flow.
- [x] 4.2 `auth-github.service.spec.ts`: a request-supplied redirect candidate is ignored for the extension target, and a handoff code is never delivered to a caller-named destination.
- [x] 4.3 `auth-github.controller.spec.ts`: `app=extension` reaches the extension target, and an unrecognized `app` value falls back to the user app rather than the extension destination. — Table-driven over the near-misses that motivated D2 (`extenson`, `Extension`, `ext`, empty), each asserted to resolve to `user`.
- [x] 4.4 Cover the binding chosen in section 2: a transaction started by a different client cannot establish an extension session, and a handoff code presented twice from any client is rejected the second time. — First half added for the extension target. The replay half was already covered store-wide at `auth-github.service.spec.ts:253`, which is target-agnostic, so it was not duplicated.

## 5. Extension: GitHub sign-in

- [x] 5.1 Add `githubSignInEnabled` to `apps/chrome-ext/src/lib/config.ts` from `VITE_EXTENSION_GITHUB_SIGNIN_ENABLED`, default off and true only on a strict `'true'`, and document the variable in `apps/chrome-ext/.env.example`.
- [x] 5.2 Add `src/lib/github-signin.ts` that launches `chrome.identity.launchWebAuthFlow` against `${apiBaseUrl}/auth/github/start?app=extension` and reads `code` or `githubError` from the resolved redirect URL. Keep it out of `lib/firebase.ts`, which stays Firebase-only.
- [x] 5.3 Map each error indicator to distinct recoverable copy, and distinguish a closed authorization window — surfaced through `chrome.runtime.lastError`, as the Google flow already handles — as a cancellation rather than a backend or configuration failure.
- [x] 5.4 Add an `exchangeGithubSession(code)` method to `src/lib/api.ts` beside `loginWithFirebaseToken`, reusing the existing `tokenPairResponseSchema` parsing and `setStoredSession` so the stored session shape is unchanged.
- [x] 5.5 Render the GitHub action in the popup's unauthenticated state per the frame approved in 1.4, gated on the flag, using the existing injectable-dependency pattern in `src/popup/main.ts` so the flow stays testable.
- [x] 5.6 Confirm the generated manifest needs no change: the `identity` permission and the API host permission the flow requires are already emitted by `vite.config.ts`, and `launchWebAuthFlow` against a non-Google URL needs no `oauth2` entry.

## 6. Extension tests

- [x] 6.1 `lib/github-signin.spec.ts`: start URL carries the extension target; a resolved redirect with a code returns it; each `githubError` indicator maps to its copy; a closed window reports cancellation.
- [x] 6.2 `lib/api.spec.ts`: the session exchange posts the handoff code, stores the returned token pair, and surfaces API failures through the existing error mapping.
- [x] 6.3 `popup/main.spec.ts`: the GitHub action appears when the flag is enabled and is absent when it is not, and a completed GitHub sign-in moves the popup to a signed-in state. Update the existing unauthenticated-state literals, which assert popup markup exactly.
- [x] 6.4 `lib/config.spec.ts`: the flag defaults off, is true only on a strict `'true'`, and leaves the Google and email paths unaffected.

## 7. Docs

- [x] 7.1 Update `docs/ui/chrome-ext.md` with the popup's sign-in actions and the flag that gates the GitHub one, describing the shared arrangement once rather than per state.
- [x] 7.2 Add `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` to `docs/deployment.md`, noting that it is optional, that the flow fails closed when unset, and that the extension id — and therefore the value — differs between an unpacked development build and a published one.
- [x] 7.3 Note in `docs/deployment.md` that the extension origin must be present in `ALLOWED_ORIGINS`, since the session exchange fails on CORS otherwise. `deploy/github-environment.staging.example.env` already carries the placeholder.

## 8. Verification

- [x] 8.1 `pnpm --filter @gitiempo/api lint typecheck test`.
- [x] 8.2 `pnpm --filter chrome-ext typecheck`, `test`, and `build`, per `apps/chrome-ext/AGENTS.md`.
- [x] 8.3 2.3 applied, so ran `packages/shared`'s vitest suite and confirm `packages/shared/openapi.json` is current, since typecheck and build do not catch stale contract fixtures.
- [x] 8.4 Confirm the extension still imports nothing from `packages/web-shared` and no PrimeVue, Vue Router, Pinia, or SPA bootstrap module, per the extension's constraints.

## 9. External configuration (manual)

- [ ] 9.1 Set `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` per environment to that environment's extension redirect URL, and confirm the matching `chrome-extension://<id>` origin is in `ALLOWED_ORIGINS`.
- [ ] 9.2 Verify the full round trip against staging with the flag on: a GitHub-authenticating member reaches a signed-in popup, a denial returns recoverable copy rather than a stranded window, and a non-member email is rejected.

## 10. Close out

- [ ] 10.1 Confirm the `github-signin` capability has since gone live under `openspec/specs/`, and if so re-home the backend requirements this change added to `chrome-extension` into that capability, as `design.md` and `proposal.md` both record.
- [ ] 10.2 After deploy verification, archive this OpenSpec change.

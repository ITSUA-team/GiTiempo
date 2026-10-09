# Local HTTP acceptance evidence

Date: 2026-10-08
Build: local uncommitted implementation on `unify-github-oauth-account-linking`
Environment: disposable native PostgreSQL (`gitiempo_runtime_test`) on port 55439; Nest `AppModule` initialized with the same `cookie-parser` middleware as `src/main.ts`.

This is controlled API acceptance evidence. It does not use a real GitHub account, authorization code, organization, App installation, extension profile, or deployment environment. OAuth provider operations were simulated at the HTTP boundary only: the authorization URL, code exchange and `/user` identity response. The HTTP controller, JWT guard, encrypted account-link cookie, opaque state, callback routing, service, Drizzle/PostgreSQL writes and Firebase fake adapter were real.

## Executed transcript

One-off controlled account-link lifecycle command (the temporary probe was removed after recording this transcript):

```sh
DATABASE_URL='postgresql://localhost:55439/gitiempo_runtime_test?host=/private/tmp' \
NODE_ENV=test LOG_LEVEL=silent \
pnpm --filter @gitiempo/api exec node --env-file-if-exists=.env \
  node_modules/vitest/vitest.mjs run --config vitest.e2e.config.ts \
  test/github-account-http-acceptance.temp.e2e-spec.ts
```

Result: **1 file, 6 HTTP scenarios passed**. Test fixtures used freshly generated UUIDs and their workspace/user rows were removed after the run. No authorization code, access token, refresh token, user email, or encrypted credential value is recorded here.

Repeatable sign-in/extension command (from `apps/api`):

```sh
DATABASE_URL='postgresql://localhost:55439/gitiempo_runtime_test?host=/private/tmp' \
NODE_ENV=test LOG_LEVEL=silent \
pnpm --filter @gitiempo/api exec node --env-file-if-exists=.env \
  node_modules/vitest/vitest.mjs run --config vitest.e2e.config.ts \
  test/github-signin-http-acceptance.e2e-spec.ts
```

Result: **1 file, 3 HTTP scenarios passed**. Its source is retained as a controlled, repeatable acceptance probe. It configures only in-memory test values for the missing local OAuth and extension redirect settings; it never uses a real client secret or external GitHub request.

Repeatable Disconnect/tracking command (from `apps/api`):

```sh
DATABASE_URL='postgresql://localhost:55439/gitiempo_runtime_test?host=/private/tmp' \
NODE_ENV=test LOG_LEVEL=silent \
pnpm --filter @gitiempo/api exec node --env-file-if-exists=.env \
  node_modules/vitest/vitest.mjs run --config vitest.e2e.config.ts \
  test/github-disconnect-tracking-http.e2e-spec.ts
```

Result: **1 file, 1 HTTP scenario passed**. The fixture seeds a verified installation, organization policy, mapped public project, and assignment directly; it does not claim a live GitHub App installation.

## Results

| Manual-check facet                                        | Steps and expected result                                                                                                                                                                                                                                       | Observed result                                                                                                                                                                                                                                                                                                   | Scope                                                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 11.3 authenticated account link/reconnect/replacement     | `GET /github/account/auth-url` with a live GiTiempo JWT, then callback with the returned state and encrypted HttpOnly cookie; repeat same provider ID; retry with a different provider ID. Expect profile redirect, one link, then safe mismatch.               | URL used `account_link.*`, requested exactly `user:email read:org read:project`, cookie was present and callback redirected to `?github=connected`. Reconnect left one OAuth grant. Different ID redirected with `github_identity_mismatch`; prior account stayed unchanged.                                      | Simulated provider; real HTTP, state, cookie and database path.                                                                    |
| 11.4 cross-user ownership                                 | A second user completed a link callback for the first user's provider ID.                                                                                                                                                                                       | Redirect was `github_account_conflict`; it did not contain first-user identity data. The second user had no link and the first link/grant remained.                                                                                                                                                               | Simulated provider; real HTTP/database path.                                                                                       |
| 11.5 partial consent and grant-family separation          | Complete callback with `user:email read:project`, inspect `GET /github/connection`, then add valid personal-App credentials using the retained App service.                                                                                                     | OAuth remained authorized with missing `read:org`; organization discovery reported `permission_required`. Personal data transitioned independently from `authorization_required` to `ready`; missing `read:org` remained.                                                                                         | Simulated provider. It proves status/capability routing, not a real GitHub Projects request.                                       |
| 11.10 successful Disconnect                               | `DELETE /github/connection` with a user configured with password sign-in, refetch status, query fixture membership and App credentials, then link the released ID as the second user.                                                                           | Response was `{ disconnected: true, providerRevocation: "unconfirmed" }` when revocation was simulated to fail. Status became disconnected; workspace membership persisted; App grant was deleted; released ID linked to second user.                                                                             | Simulated provider revocation; real HTTP/database path. Does not prove imported projects/tasks/history from a full live fixture.   |
| 11.11 fail-closed Disconnect                              | Configure GitHub-only fake login, call DELETE; then simulate Firebase alternative-login lookup failure and call DELETE again.                                                                                                                                   | Missing alternate login returned 403 `github_alternative_signin_required`; lookup failure returned 503 `github_disconnect_verification_unavailable`; both left the link unchanged.                                                                                                                                | Controlled Firebase adapter.                                                                                                       |
| 11.12 released-ID relink                                  | After confirmed local unlink, use the second user's authenticated link flow for the released GitHub ID.                                                                                                                                                         | Link succeeded for the second user.                                                                                                                                                                                                                                                                               | Simulated provider; real ownership constraints/database path.                                                                      |
| 11.13 stale callback after Disconnect                     | Start account-link authorization, Disconnect before callback, then submit the original callback state/cookie/code.                                                                                                                                              | Redirect was `invalid_state`; no account link or credentials were restored.                                                                                                                                                                                                                                       | Simulated provider; real generation/state/database path.                                                                           |
| 11.2 staged sign-in session                               | Start user and admin sign-in, submit browser-bound callback, then redeem the returned handoff. Replay the user handoff.                                                                                                                                         | Both redirects went to their configured user/admin callback destinations; one redemption returned the normal access/refresh pair and atomically created the link; replay returned 401. The handoff URL did not contain the simulated OAuth access token.                                                          | Simulated provider email/identity exchange; real signed state, cookie, encrypted staging, session and database paths.              |
| 11.15 extension proof/binding                             | Start Firefox extension flow with a SHA-256 challenge, complete callback, then redeem without a verifier and again with the verifier after the first attempt.                                                                                                   | Callback went only to the configured Firefox extension destination. Missing verifier returned 401 and consumed the code; replay with the correct verifier also returned 401.                                                                                                                                      | Controlled extension destination/provider; does not prove a real Chrome or Firefox extension window.                               |
| 11.14 installation-backed timer after personal Disconnect | Seed a verified workspace installation, policy, mapped public project and one assignment. Start a timer through the HTTP endpoint, DELETE the user's personal GitHub link, stop it, start/stop another issue, then have an unassigned member try a third issue. | The unlink deleted identity and both personal grants while installation, policy, project and generated task/time records remained. The owned timer stopped, another installation-backed timer started/stopped post-unlink, and the unassigned request returned 403 without time-entry or assignment side effects. | Controlled installation/API transport; real HTTP controllers, JWT, unlink service and PostgreSQL. No live installation credential. |

## Blocked or intentionally not counted as complete

- The local `.env` has no OAuth sign-in client ID/secret, so the authorization URL itself had to be simulated. This run does not prove live GitHub consent or registered callback configuration.
- No dedicated GitHub organizations, private data, personal App installation, workspace timer, browser extension or real browser sessions were available. Full live acceptance for checks 11.1, 11.2, 11.6–11.9, 11.14–11.16 still requires those fixtures; the controlled HTTP facets above are deliberately not counted as their completion.
- The simulation cannot prove provider-side cancellation/revocation, restricted organization behavior, multi-page `/user/orgs`, GitHub Projects data access, actual Firebase providers, or persistence after a deployed rollout.

Accordingly, no section 11 checkbox and no umbrella task 10.3 is marked complete from this evidence alone.


## Both extension destinations: failed/replayed handoff acceptance — 2026-10-09

Extended the retained HTTP probe `apps/api/test/github-signin-http-acceptance.e2e-spec.ts` with isolated member fixtures for Chrome and Firefox. Provider authorization/code/profile transport remains simulated; HTTP controllers, signed state, staging, proof validation, session exchange and PostgreSQL persistence are real. Each browser asserts the exact configured callback origin and path. A staged handoff presented without its verifier returns 401; presenting that same consumed code with the correct verifier also returns 401. Neither attempt changes link, OAuth grant, authorization generation or refresh-session snapshots. A fresh valid handoff creates exactly one link, grant and session; replay returns 401 and preserves the committed snapshot.

Snapshots include identity updatedAt, OAuth grant updatedAt and an internal SHA-256 digest of encrypted fields, scopes and expiry, so an in-place credential update cannot pass as unchanged. Credential values and handoff/query data are not printed. The final direct focused run passed **1 file / 4 tests** in 1.69s; focused ESLint and API typecheck passed. A fresh disposable native PostgreSQL database `gitiempo_http_acceptance` on port 55439 was used, then dropped; its cluster was stopped and the port confirmed inactive. The current local database was not used for this probe.

An initial package-script invocation unintentionally ran broader suites against the unseeded disposable database; it is not counted as a successful full-suite run. The final exact-file invocation above is the acceptance evidence. Combined with the separate real Chrome/Firefox login/cancellation and both SPA password/Google sequences, this completes task 11.15. Other task fixtures and umbrella 10.3 remain incomplete.


Reproduction from `apps/api` (fresh disposable database migrated, intentionally not seeded; the probe creates its own fixtures):

```sh
DATABASE_URL='postgresql://localhost:55439/gitiempo_http_acceptance?host=/private/tmp' \
NODE_ENV=test LOG_LEVEL=silent \
node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs \
  run test/github-signin-http-acceptance.e2e-spec.ts --config ./vitest.e2e.config.ts
```

The unintended earlier `pnpm --filter @gitiempo/api test:e2e -- test/github-signin-http-acceptance.e2e-spec.ts` invocation ran all 23 files due script argument behavior and reported 12 failing files / 14 failing tests on that unseeded disposable database, including seeded-admin 401/missing-user fixture errors. It is not a fresh full-suite pass and does not supersede the earlier seeded full-suite evidence. The direct command above is the final focused result.
# Controlled organization-discovery HTTP acceptance — 2026-10-09

`test/github-organization-discovery-http-acceptance.e2e-spec.ts` adds five probes against real Nest routes, encrypted OAuth storage, the GitHub API client's pagination and workspace membership/policy validation. Only outbound GitHub fetch responses are simulated; no real provider credential or provider request is used.

- Two pages each of organizations and active memberships produced four unique organizations despite overlapping/case-variant entries.
- No memberships produced an explicit successful `{ items: [] }`.
- A later page failure produced 503 without partial items. Independent manual active-membership validation subsequently added a permitted organization.
- A restricted organization produced OAuth-policy recovery, preserving the policy snapshot.
- Missing read:org blocked manual addition before any provider call; inactive and absent membership also rejected additions with distinct recovery. Policy rows and granted scopes remained unchanged on the failed mutations.

Fresh native PostgreSQL was initialized under `/private/tmp/gitiempo-http-org-discovery-pg-20261009` on port 55439 with a disposable `gitiempo_test` role and `gitiempo_http_acceptance` database. Migration succeeded. Exact successful command, from apps/api:

```sh
NODE_ENV=test DATABASE_URL=postgresql://gitiempo_test@127.0.0.1:55439/gitiempo_http_acceptance node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs run test/github-organization-discovery-http-acceptance.e2e-spec.ts --config ./vitest.e2e.config.ts
```

One file / five tests passed. Focused file lint, API typecheck and `git diff --check` passed. The temporary cluster was stopped and deleted; the current local application database was not used by these probes. This acceptance completes 11.7 with the allowed simulation boundary and the separately recorded assembled Settings/live-browser observations, rather than claiming real multi-page or no-membership accounts.

## Partial permission and separate App-family HTTP acceptance — 2026-10-09

Retained probe: apps/api/test/github-partial-permission-http-acceptance.e2e-spec.ts. Real Nest AppModule, cookie middleware, routes, OAuth/App encrypted persistence, session handoff and PostgreSQL were used; GitHub code/profile/email and data HTTP responses were simulated. Firebase uses the test adapter. No real provider account or credential was used.

Five cases passed:

- A valid user:email-only sign-in redeems a normal session and persists its partial scopes. Organization discovery returns 403; manual policy add returns the permission-required code without changing the identity/grant/session snapshot.
- Complete provider denial returns the handled login error, no handoff code or token exchange, and no identity/grant/session mutation.
- Missing OAuth read:project keeps personalData ready and the Projects HTTP endpoint usable. The simulated provider asserts it receives the App credential, not the OAuth credential. This case returns an empty Projects list; real private Project contents/import were verified separately in the browser.
- A seeded App-only migrated-equivalent identity returns a nonempty App-backed Projects result with no OAuth grant. Connection status asks for OAuth authorization for discovery; discovery returns 404 with the explicit missing-OAuth message before any provider call. The test does not execute a migration; the existing four migration regressions separately verify the real App-only backfill.
- A mismatched personal-App callback returns github_identity_mismatch. Identity login/ID, scopes, encrypted access-credential digests and refresh-session IDs remain unchanged for both families. This snapshot does not claim a digest of every credential-row field.

The initial added App-only test expected 403; inspection confirmed the established missing-grant contract is 404. The expectation was corrected without changing production behavior. An earlier harness failure was resolved by adding cookieParser, matching production middleware.

Final command from apps/api (fresh migrated disposable database, no seed required):

```sh
NODE_ENV=test DATABASE_URL=postgresql://gitiempo_test@127.0.0.1:55439/gitiempo_partial_final node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs run test/github-partial-permission-http-acceptance.e2e-spec.ts --config ./vitest.e2e.config.ts
```

Final observed run: 1 file / 5 tests passed in 1.43s. The run output was filtered before reporting callback details. API typecheck passed; focused lint passed again after the final missing-grant expectation correction. The disposable PostgreSQL cluster was stopped and deleted. Current local5432 was not used by these probes; separately authorized live-browser fixture preparation is documented independently.

Final disposable cluster /private/tmp/gitiempo-final-http-pg-20261009 was stopped and deleted after the combined run. No test cluster remains running on55439.

## Remaining HTTP acceptance and final combined verification — 2026-10-09

Retained probe: apps/api/test/github-oauth-remaining-http-acceptance.e2e-spec.ts. Real Nest routes, cookies, encrypted persistence, session handoff and PostgreSQL were exercised with simulated GitHub responses and the test Firebase adapter. Three cases passed:

- OAuth-only organization policy can be saved, but private repositories return 404 and installation setup returns 409. Direct POST /time-entries/timer/start-from-github returns 409 with github_installation_required; the fixture workspace has no tasks or time entries afterward.
- Full HTTP Disconnect followed by a newly initiated guest GitHub login resolves the existing member by verified email and recreates one account link/grant through the usual session handoff. This is distinct from authenticated Connect and complements the real released-ID second-account link.
- Disconnect invalidates a staged sign-in handoff; redemption returns 401. Replayed callbacks without their consumed browser cookie and an old App callback reject without restoring identity, grants or sessions. A consumed App-state namespace submitted to the OAuth callback is also rejected. This is not a claim of every unconsumed cross-purpose state combination. Earlier controlled account-link callback tests and PostgreSQL lifecycle tests separately prove the stale OAuth callback and delayed OAuth/App refresh cases. This suite snapshots IDs/counts; it does not hash every credential field.

Final combined command, from apps/api, against a freshly migrated disposable database:

```sh
NODE_ENV=test LOG_LEVEL=silent DATABASE_URL=postgresql://gitiempo_test@127.0.0.1:55439/gitiempo_final_http node --env-file-if-exists=.env ./node_modules/vitest/vitest.mjs run test/github-partial-permission-http-acceptance.e2e-spec.ts test/github-oauth-remaining-http-acceptance.e2e-spec.ts --config ./vitest.e2e.config.ts
```

Observed result: 2 files / 8 tests passed in 2.17 seconds. Both files passed focused ESLint; API typecheck passed. LOG_LEVEL=silent kept callback parameters out of test output. The current local database on port 5432 was not used by these probes. The final disposable cluster was stopped and deleted; no test cluster remains on port 55439.

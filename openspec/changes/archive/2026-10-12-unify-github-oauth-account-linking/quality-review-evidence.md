# Quality review follow-up — 2026-10-09

Branch: `unify-github-oauth-account-linking`, working-tree fixes on `b4877457`.
Review focus: logic, error handling and maintainability. No deployment, real GitHub consent, database mutation or new security audit was performed in this pass.

## Resolved findings

- **HIGH — provider failure logging out GiTiempo.** The shared HTTP client recognizes `github_authorization_required` before refreshing the session and after a genuine session refresh. Expired/rejected OAuth credentials and discarded refresh results use that stable code. Generic app-session 401 still refreshes and logs out if the refreshed token is rejected.
- **HIGH — missed installation discovery during Settings startup.** Missing/unavailable associations wait for OAuth readiness without spending the automatic attempt. Verified associations that become unavailable while readiness is pending can be discovered when readiness arrives.
- **MEDIUM — uncontrolled malformed provider responses.** JSON parsing and token/profile shape validation return controlled 503 errors. Invalid expiry metadata is rejected rather than converted to a non-expiring grant. Empty optional refresh tokens normalize to null.
- **MEDIUM — stale automatic Settings work.** Setup checks current organization membership before sending its request. Pending checks have per-attempt identity and workspace scope so an old request cannot clear another workspace's indicator.
- Added regressions for delayed readiness, initial/retry provider errors, real session errors, revoked refresh credentials, Disconnect during refresh, malformed payload/expiry, organization removal during another check, workspace switching and explicit installation Disconnect.

## Verification

| Package | Test files | Passing tests | Typecheck | Lint |
| --- | ---: | ---: | --- | --- |
| API | 42 | 506 | pass | pass |
| web-shared | 35 | 214 | pass | pass, 3 existing warnings |
| admin-web | 65 | 536 | pass | pass, 2 existing warnings |
| user-web | 50 | 530 | pass | pass, 11 existing warnings |

Used root Turbo `test lint typecheck` with those four package filters and dependency builds. API/admin checks were repeated after their final functional/test updates. Existing warnings are in other files; dependency-sync and Vite transform notices also remain. They did not prevent verification. New tests for the original HTTP/session and expired-credential defects were observed failing before their corresponding fixes. Strict OpenSpec validation and `git diff --check` pass.

## New MCP tooling

The installed `omx_code_intel` server was invoked through the MCP SDK over stdio because this live chat's tool catalog had not refreshed. These were actual MCP tool calls, not substitutes with similarly named scripts:

- `lsp_diagnostics_directory`: API final state has 0 errors and 0 warnings. This server's diagnostics backend uses TypeScript `tsc`; it is not a persistent language-server session. Both Vue apps and shared Vue code additionally passed their project `vue-tsc` checks.
- `ast_grep_search`: inspected `new UnauthorizedException($$$ARGS)` across GitHub services, `await $RESPONSE.json()` in the OAuth client, `attemptedReconciliations.$METHOD($$$ARGS)` and `await requestSetup($$$ARGS)` in Settings reconciliation.
- AST locations were read in surrounding source context. Pattern matches alone were not treated as proof of correctness.

## Independent review

Separate reviewers inspected HTTP/OAuth regressions, the broader API/authentication paths, and Settings architecture. The architecture reviewer re-read the final race fixes and returned **CLEAR**; the API reviewer returned **APPROVE** for the fixed error-handling paths. The confirmed logic/error-handling findings listed above are fixed and regression-covered. This follow-up is not a claim that every unchanged branch file or every live provider outcome was re-executed.

A low maintenance tradeoff remains: the shared transport recognizes the GitHub recovery-code literal at its two 401 decision points. The API uses the same code consistently and regressions cover both paths. A configurable error classifier or shared constant can be considered if more providers require this behavior; adding that abstraction is not necessary for this fix.

## Separate specification follow-up

The broader review noticed that `specs/github-oauth-foundation/spec.md:33,49` describes session binding for both authenticated authorization starts, while the preserved personal GitHub App flow (`apps/api/src/github/services/github.service.ts:57,317`) binds state to user/purpose/generation without `sessionTokenHash`. The OAuth account-link flow has session binding. Current App persistence checks generation and cutoff (`github-connections.service.ts:71`) and blocks the documented logout/Disconnect resurrection cases; no supported failure regression was reproduced in this quality review. This is an explicit specification/retained-flow alignment item, not a completed security assessment. The personal App protocol was not redesigned in this fix pass; do not use this report as proof of full compliance with that broader session-binding wording.

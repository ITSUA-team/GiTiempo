# Extension edge-case QA — 13 October 2026

This addendum records the additional extension-only QA pass. It does not change
the status of the full manual matrix in `qa.md`; controlled DOM cases validate
the extension's reactions, not GitHub's authenticated/private rendering.

## Environment and boundary

- Branch: `feat/external-github-time-tracking`, with the uncommitted change in
  this workspace.
- Isolated Chrome for Testing session with a fresh profile and the unpacked
  `apps/chrome-ext/dist/chrome` Manifest V3 extension. It was signed out of
  both GitHub and GiTiempo. No browser profile belonging to the user was read.
- Public, read-only target: `https://github.com/ITSUA-team/GiTiempo/issues/439`.
  No GitHub records were changed and no timer was started.
- The signed-out injected control rendered the exact issue title/repository/
  number and a GiTiempo sign-in prompt, with no Start action.
- The session was closed after the pass. Non-secret screenshots retained for
  review: `/private/tmp/gitiempo-extension-qa-direct-signedout.png`,
  `/private/tmp/gitiempo-extension-qa-literal-markup-restored.png`, and
  `/private/tmp/gitiempo-extension-qa-context-restored.png`.

The checked unpacked build was version `0.1.1`, registered on
`https://github.com/*`, with `https://github.com/*/*/pull/*` excluded. The
isolated signed-out UI pass initially used a transient build with a tunnel
origin because the first verification command passed Vite mode incorrectly;
that output was not retained as the user-facing local build. The Chrome
unpacked target was then rebuilt with the explicit command
`pnpm --filter chrome-ext exec env EXT_TARGET=chrome vite build --mode dev`.
Its manifest and bundles contain only `http://localhost:3000` as the API
origin, plus GitHub, and its tree fingerprint is
`3c3abcb84f0666eac3f519328f863518f3697e8ad4849febe9092d58c30324bb`.
This is a local candidate, not a production or store-release certification.

## Executed browser scenarios

| Scenario | Method | Result |
| --- | --- | --- |
| Public direct issue, signed out | Real public GitHub page and loaded extension | Pass: exactly one injected root; title/repository/#439 matched the rendered issue and the control offered only GiTiempo sign-in. |
| Pull request / draft surface | Real `https://github.com/ITSUA-team/GiTiempo/pull/444` | Pass: no injected root. The manifest exclusion prevents the control from mounting on a PR. |
| Malformed Projects issue pane | Real GitHub Projects-shaped URL with malformed `issue=bad|value` | Pass: no injected root. |
| Literal title markup | Controlled temporary mutation of the public issue's existing title DOM to `<img src=x onerror=window.__qaXss=1> literal markup` | Pass: one root remained, the shadow DOM displayed the string literally, contained zero `img` elements, and `window.__qaXss` remained unset. The original title was restored. |
| Missing/delayed title | Controlled temporary empty title, then restored the original title | Pass: the root was removed while the title was absent and remounted once after it returned. |
| Stale rendered body identity | Controlled temporary change of the issue body-header link from #439 to #451, then restore | Pass: root was removed on identity mismatch and remounted after the exact link was restored. |
| URL changes before the issue DOM | Controlled `history.pushState` to #451 while #439 DOM remained, then restored #439 and dispatched `popstate` | Pass: root was removed while URL and DOM disagreed and remounted after they matched. |

## Authenticated isolated-fixture lifecycle pass

An additional Chrome-for-Testing pass used a separate temporary profile and a
copy of the checked Chrome unpacked extension. Only that copy's API origin was
changed to the disposable API fixture at `127.0.0.1:3032`; the repository's
`dist` tree and user-loaded extension were not changed. A fresh synthetic QA
account was minted inside the test process and stored only in that temporary
extension profile. No real browser profile, GitHub login, or credential was
used. The fixture is a controlled transport boundary and does not certify a
live GitHub provider flow.

| Scenario | Method | Result |
| --- | --- | --- |
| Rapid duplicate start | Real injected Start button on public #439; two immediate programmatic clicks in the isolated renderer | Pass: UI reached one Running/Stop state. An independent, read-only QA-DB aggregate reported one running entry and one #439 GitHub mapping for the synthetic account, confirming no duplicate start. The test timer was then stopped through the real injected Stop button; final aggregate reported zero running entries and the single #439 mapping. |
| Mid-snapshot account change | Controlled CDP transport paused the extension's current-timer request, changed only the temporary extension session from synthetic Bob to synthetic admin, then resumed it | Pass: the actual control showed `Your session or workspace changed…` and no Start/Stop action. Clicking its actual Retry control returned to the valid Start state. Both fixture accounts belong to the same QA workspace, so this proves account-change handling but not a distinct-workspace transition. Screenshot: `/private/tmp/gitiempo-extension-auth-stale-session.png`. |
| Mid-snapshot distinct-workspace change | A new disposable synthetic identity and two new `QA Extension` workspaces were created solely in the API-3032 QA database. After minting sessions for both memberships, controlled CDP transport paused the current-timer request, swapped the temporary extension from workspace A to B, then resumed it | Pass: the actual control showed `Your session or workspace changed…`, with no Start/Stop action. Actual Retry recovered to `QA Extension B …` and a valid Start action, with no timer created. Screenshot: `/private/tmp/gitiempo-extension-auth-distinct-workspace.png`. The synthetic user, both workspaces, settings, memberships, refresh tokens, temporary session file, extension storage, and browser profile were removed after the check. |
| Context changes before Start | With a valid Start control for #439, controlled `history.pushState` changed only the URL to #451 while retaining #439 DOM, then clicked the real Start control | Pass: no timer started; the control showed `Issue context changed. Refresh before starting.` and no Stop action. Restoring #439 then clicking actual Retry returned to Start. Screenshot: `/private/tmp/gitiempo-extension-auth-context-change.png`. |
| Popup sign-out and recovery | A second temporary extension browser opened the actual popup page, signed out using its account menu, then a controlled storage setup modeled a failed provider cleanup by setting only the pending-cleanup marker | Pass: real Sign out reached the normal signed-out actions. The modeled pending state displayed the actual `Retry sign-out` button; clicking it cleared the marker and returned to normal sign-in actions. Screenshot: `/private/tmp/gitiempo-extension-popup-provider-cleanup-pending.png`. This validates UI recovery from the persisted marker, not a live Firebase provider failure. |
| Expired session | A third temporary profile received schema-valid but deliberately unusable synthetic access and refresh strings, then reloaded #439 | Pass: the injected control rendered only `Sign in to GiTiempo…`; it exposed neither Start nor a false Running/Stop state. Screenshot: `/private/tmp/gitiempo-extension-auth-expired-session.png`. |

The temporary extension storage was cleared and both isolated browser sessions
were closed after this pass. The disposable fixture API/database is owned by
the accompanying web QA lane; its infrastructure is not retained by this
extension QA pass.

The controlled DOM probes intentionally modified only the local renderer and
restored the original DOM before the session closed. They establish safe
handling of delayed/stale DOM states and escaped rendering, but do not replace
an authenticated GitHub private-repository test.

## Automated verification run

- `pnpm --filter chrome-ext test -- --run` — 11 files, 186 tests passed.
- `pnpm --filter chrome-ext typecheck` — passed.
- `pnpm --filter chrome-ext lint` — passed.
- `pnpm --filter chrome-ext build:chrome -- --mode dev` — completed but its
  extra separator caused Vite mode not to select the intended dev environment;
  it produced a transient tunnel-origin output and is not release evidence.
- `pnpm --filter chrome-ext exec env EXT_TARGET=chrome vite build --mode dev`
  — passed and restored `dist/chrome` with only the localhost API origin.
- `git diff --check -- apps/chrome-ext` — passed.

The existing focused regressions additionally cover one-pending-start,
popup revalidation when the title is delayed, stale session/workspace denial,
in-flight account/workspace switch, failed logout cleanup, refresh-after-
logout, network retry, and lost successful start reconciliation. These are
automated/controlled coverage, not a replacement for the remaining full
manual cross-browser lifecycle matrix.

## Public privacy-policy observation

An anonymous read-only request to `https://gitiempo.com/privacy/` returned
HTTP 200 on 13 October 2026. The published HTML is still dated **22 September
2026** and says that the extension sends only repository name and issue number,
then retrieves the title from GitHub. The current candidate instead sends the
bounded issue title and canonical direct issue URL, and external-reference
starts do not retrieve from GitHub. The updated local source correctly states
the current flow and is dated 13 October 2026. Therefore production policy
publication is now independently confirmed as **stale and release-blocking**;
no deployment was performed.

## Remaining extension QA gaps

- This lane has no usable Firefox automation. The existing `qa.md` records an
  independently installed Firefox 157.0.1 and the native-entry Computer Use
  denial; the user-attested private direct issue and Projects-pane
  Chrome/Firefox smoke remains the available Firefox evidence.
- Full authenticated delayed-title, malformed Projects-pane and context-change
  behavior against live private/customer GitHub DOM remains pending; this pass
  used a signed-out public page plus clearly labeled controlled DOM mutations.
- Popup literal-title rendering could not be independently observed from the
  direct popup page: it becomes the active tab and has no GitHub issue context.
  A native popup was also opened over the isolated active GitHub issue after a
  temporary literal-title mutation, but Chrome closed that transient native
  popup before its CDP target could be read. The issue renderer had already
  restored its original title. This is not popup escaping evidence; the
  injected-control literal-markup pass above remains the available title
  escaping evidence from the agent's run. The later user-attested native
  Chrome popup check passed; see qa-popup-markup.md. Firefox popup markup
  behavior was not separately checked.
- A real Firebase disconnect/failed-provider-logout remains outside this
  extension-only pass. Managed-mapping and outbound-call audit evidence
  belongs to the API/rollout QA records, rather than this extension addendum.

## Firefox navigation and unsupported-page follow-up

The user explicitly repeated the final local Firefox build checks on the permitted private customer issue and confirmed all three outcomes: issue-list → issue → back → issue navigation without reload shows exactly one control with the correct title; opening and closing the issue in Projects mounts and removes its control with the pane; a Pull Request exposes no available Start action in either the page control or popup. This is user-attested real Firefox evidence, in addition to the previously confirmed direct/Projects Start/Stop. It does not independently certify Firefox delayed-title, missing-title, malformed-pane, failure or complete responsive-state coverage. No code/build changed for this follow-up.

## Firefox offline-mode follow-up — pass, user-attested

The user also tried Firefox's GitHub-page DevTools Offline setting and observed
that extension requests still succeeded through their separate request context.
That initial attempt did not inject an extension API failure and was
inconclusive for network recovery; it was not a product defect.

On 13 October 2026 the user subsequently explicitly confirmed that the Firefox
offline-mode test passed and requested that result be recorded. The current
scenario status is therefore **Pass (user-attested)**, superseding the earlier
inconclusive scenario status. The final interruption method and network traces
were not supplied, and the agent did not independently execute this Firefox
check. This confirmation covers the offline-mode scenario; the remaining
failure, expiry and browser-state matrix is not marked complete by it.

## Isolated signed-session expiry and identity-unlink follow-up

Run: 13 October 2026. A uniquely named disposable loopback PostgreSQL database
was migrated through `0022`, then an ephemeral Nest server bound only to
`127.0.0.1` on an OS-assigned port. The fixture used the test-only FakeFirebase
adapter and a real 1-second HS256 GiTiempo access JWT minted through
`POST /auth/login`; no development/user record, existing browser profile, provider credential,
GitHub API call, or GitHub write was used. The external reference named the
permitted public `ITSUA-team/GiTiempo#439`, but validation and recording stayed
inside the fixture.

| Scenario | Result |
| --- | --- |
| Reference payload validation before writes | Pass: 15 isolated HTTP requests covering a mismatched canonical URL; zero, negative, and above-`MAX_SAFE_INTEGER` issue numbers; HTTP and non-GitHub hosts; a board URL; missing/empty/overlong title; and each caller-supplied `workspaceId`, `userId`, `trackingMode`, `referenceProvenance`, and `isVerified` field returned 400. After every request, project, project-reference, task, task-reference, time-entry, and project-assignment counts remained identical. |
| Actual access expiry and refresh recovery | Pass: an external timer began with a genuine short-lived access token. After expiry, `GET /time-entries/current` returned 401; `POST /auth/refresh` returned 200; the replacement session retrieved the same still-running entry. |
| Identity-only GitHub unlink | Pass: `DELETE /github/connection` removed a synthetic account-link row that had no OAuth grant or App credential, returned 200, and the same GiTiempo access token still retrieved the unchanged running entry. No provider revocation was attempted because no provider token existed. |
| Revoked refresh preserves server timer | Pass: the current refresh token was revoked by `POST /auth/logout`; after the signed access token expired, current-timer and refresh calls each returned 401. Direct database inspection confirmed the original entry still had `ended_at IS NULL`. |
| Fresh session recovery and stop | Pass: a new FakeFirebase login returned the same running entry, and its conditional stop completed with HTTP 200 and a positive persisted duration. |

The dedicated helper ran on 13 October 2026 through:
`pnpm --filter @gitiempo/api exec vitest run --config vitest.e2e.config.ts
test/manual-extension-session-expiry-qa.e2e-spec.ts`, with `NODE_ENV=test`
and `JWT_ACCESS_TTL=1s`. Vitest reported `1` file and `1` test passed.

The exact random database suffix and OS-assigned listener port were not retained
in the evidence log, so this record intentionally does not invent them. The
database used the isolated `gitiempo_qa_session_expiry_*` naming guard; its
`dropdb` cleanup command completed successfully, the local name-marker file
was then absent, and the helper source was deleted. The Nest listener was
in-process and closed through the helper's `finally` block before the passing
runner process exited; no standalone server or browser profile was retained.
This keeps the check out of the normal suite as a timing-sensitive test. It is
actual API/session and database evidence, not a native Chrome popup rendering
test; the earlier controlled browser check remains the evidence that an
unusable session does not display a false Running/Stop state.

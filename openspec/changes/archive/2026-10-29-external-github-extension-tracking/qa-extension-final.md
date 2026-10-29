# Extension recovery QA boundary — 13 October 2026

## Scope

This note closes a bounded follow-up attempt for the remaining native-popup
recovery evidence. It does not change the completion status of the manual QA
matrix in `qa.md`.

The checked code is commit `e0714382` on
`feat/external-github-time-tracking`. No product source, distribution bundle,
main browser profile, GitHub record, or production API was changed.

## What is already evidenced

The following existing evidence remains the basis for the relevant recovery
requirements:

- `qa-extension-follow-up.md` records an actual native Chrome popup Start/Stop
  flow, an injected-control request failure with Retry, a lost successful
  start-response reconciliation, rapid duplicate-click prevention, and a real
  extension logout that preserves the server timer until a fresh fixture login
  observes and stops it.
- `qa-extension-completion.md` records a real signed access-token expiry that
  refreshed the same timer, a revoked-refresh recovery path that retained the
  owned server timer until a fresh login, and an actual popup recovery UI from
  a persisted cleanup marker.
- The Firefox direct-issue, Projects-pane, navigation, Pull Request, and
  offline checks are user-attested in `qa.md`. They do not establish the
  remaining native-popup provider-cleanup path.

Together these cover the local-session and server-timer portions of task 9.12
and most of task 9.22. The following controlled fixture covers the remaining
provider-cleanup rejection and retry boundary for task 9.22.

## Follow-up attempt

An isolated headed Chrome-for-Testing browser was started with:

- a fresh profile;
- a temporary copy of the already-built Chrome extension;
- a loopback-only API fixture intended for `127.0.0.1:3054`; and
- the public, read-only `ITSUA-team/GiTiempo#439` page.

The temporary copy alone was rewritten to use the loopback origin. It also
replaced only the compiled `signOutFromFirebase()` helper with a deterministic
throw. `signOutEverywhere()` and `retryProviderCleanup()` remained the compiled
production code; this is the narrow seam that distinguishes a provider-cleanup
failure from the best-effort backend revoke request. The repository `dist` tree
and normal browser profile were not used.

The direct CDP connection to the extension worker endpoint initially rejected a
WebSocket handshake with HTTP 500. A browser-level CDP `Target.attachToTarget`
connection then attached to the same isolated worker successfully. This is a
tooling transport fallback, not a change to extension behavior.

## Controlled provider-failure result

1. The fixture seeded an active, owned synthetic extension session and returned
   one running loopback timer (`22222222-2222-4222-8222-222222222222`).
2. The browser-action popup was opened through `chrome.action.openPopup()`;
   the action-created popup target displayed `QA extension final`, `Running
   timer`, `QA active issue`, and `Stop Timer`.
3. A CDP mouse press/release on that actual popup's **Sign out** control ran
   the temporary `signOutFromFirebase()` failure. It rendered:

   ```text
   Sign-out incomplete
   Sign-out was incomplete. Retry to remove the remaining provider session.
   Retry sign-out
   ```

   At this point extension storage contained only
   `gitiempo.extension.provider-cleanup-pending: true`; the synthetic local
   GiTiempo session had been cleared.
4. The original helper was restored in the temporary copy and the isolated
   browser was restarted. A temporary popup page was used only to expose the
   already-persisted recovery UI, because this browser instance's
   `chrome.action.openPopup()` reported that no active browser window was
   available after restart. It showed the expected retry state.
5. A CDP mouse press/release on **Retry sign-out** then returned the popup to
   `Sign in to continue`. Extension storage was `{}`: the pending marker was
   removed. The loopback `GET /time-entries/current` still returned the same
   active timer id, with `endedAt: null`.

This proves the production recovery flow clears the local session first,
persists and presents a provider-cleanup retry state when only Firebase cleanup
fails, then clears that state after a successful retry without stopping the
server timer. The initial failure presentation used the actual browser-action
popup; the post-restart retry presentation used the identical popup UI in a
regular extension page due to the documented Chrome automation limitation.

Task 9.12 retains its existing native-popup and server-timer recovery evidence
from the reports above; this follow-up adds the native running-timer state but
does not repeat its request-failure suite. Tasks 9.4 and 9.21 gain the native
popup running/error state evidence here. Firefox delayed/missing-title and
malformed-pane behavior remain user-attested in `qa.md`.

## Literal task audit

The prior artifacts collectively cover every scenario named by task 9.12:
controlled request failure and Retry plus the user-attested Firefox offline
check; signed access expiry/refresh and revoked-refresh recovery; duplicate
click prevention; stale issue context; inactive, closed, and managed denials;
and reconciliation after a lost successful `201` response. The failed-request
fixture created no running entry, while the lost-response fixture reconciled
the authoritative running entry and exposed Stop without a duplicate. Existing
timer preservation is also directly covered by logout/reload/owned-stop
evidence. A separate native-popup rendering of every failure category is not a
literal requirement of task 9.12.

For task 9.21, this report contributes the native popup's running and
provider-cleanup error states. Existing reports cover the approved Pen
desktop/mobile User and Admin frames, static privacy widths, ready injected
control and Projects-pane states, plus user-attested Firefox shared-popup
behavior. The only attempted additional evidence was the four popup frames
described below.

## Focused extension visual parity audit

The approved extension frames are `xkeDn` (ready), `bPI7N` (context loading),
`iWQgl` (context error), `F5nKsg` (managed denial), `E65VJ` (workspace
loading), and `bTmp0` (running). The actual native running view and the actual
provider-cleanup error view above supply the visual evidence for `bTmp0` and
the common error treatment. The existing controlled request-failure screenshot
in `qa-extension-follow-up.md` supplies the context-error/retry treatment.

The popup rendering contract was then checked against the remaining Pen states
(source-only review, not a substitute for a runtime screenshot):
the fixed 320px surface has a 480px minimum height; loading says `Loading
extension state`; missing workspace renders `Checking workspace…`; connection
and context failure use a labelled error panel and explicit retry action; and
managed denial flows through the same no-fallback error treatment. The source
uses visible focus outlines on every popup action, labels the dashboard link
and account-menu trigger with `aria-label`, and retains text buttons for Retry,
Start, and Stop. The focused popup tests assert both retry copy and focus-visible
action classes. No deviation from these approved retained states was found.

### Runtime screenshot attempt

A fresh temporary extension copy and loopback fixture on `127.0.0.1:3056`
were launched specifically for context loading, workspace mismatch/loading,
context error, and managed denial. The extension ID was discovered dynamically
from the browser target list. Every regular popup target at that actual ID
rendered Chromium's `ERR_BLOCKED_BY_CLIENT` page before extension code ran.
The three captured PNGs were therefore discarded; they are not claimed as
visual evidence. The temporary browser, listener, copy, and invalid images
were removed. This is a Chrome-for-Testing/agent-browser extension-navigation
limitation, not a product rendering result.

Firefox’s shared popup behavior and normal flows remain user-attested; the
popup bundle and rendering contract are shared across supported browsers.

## Executed compiled-popup visual fallback — integration owner

After the discarded MV3/navigation and fixture-assembly attempts above, the
integration owner successfully served an untouched temporary copy of the
compiled `popup.js`, CSS and icons over loopback port 3057. A synchronous local
fixture script replaced only `chrome.runtime`/`chrome.tabs` responses before
the production popup entry loaded. This is **browser-rendered production UI
with controlled extension-API inputs**, not a native popup, service-worker or
activeTab transport check. No production source or normal dist bundle changed.

Chrome for Testing rendered and captured these actual 320×480 states:

- `qa-popup-final-context-loading.png`: unresolved initial snapshot/context;
  Loading extension state and session/timer-context help, no Start.
- `qa-popup-final-workspace-loading.png`: authenticated context without
  workspace; Checking workspace… and disabled Start.
- `qa-popup-final-context-error.png` and
  `qa-popup-final-context-error-focus.png`: missing current issue title;
  Unable to read issue and Retry. Three real Tab presses focused Retry with a
  measured 2px outline. Accessible dashboard/account action labels remain.
- `qa-popup-final-managed-denial.png`: actual Start click returned the controlled
  installation-unavailable remedy; Connection lost and Retry connection, no
  Start or alternate recording action. Measured scrollWidth=320 at innerWidth=320
  and the popup root is 480px high.

All screenshots are under `/private/tmp` and were visually inspected. The
fixture contains synthetic identity/context only. Its named browser was closed,
its exact server stopped, the temporary copy/script removed, and port 3057 had
no listener. Earlier discarded screenshots are not evidence.

### Historical design/documentation discrepancy — resolved below

A fresh read of saved `GITiempo.pen` frames reveals a real presentation difference
from `docs/ui/chrome-ext.md`: the Pen context/loading/denial states use an issue
card and full-width bottom Retry/Start actions; the documented current popup
uses the existing centered error treatment and text Retry, with a global loading
state. Pen ready/running actions fill the frame bottom, while the current
min-height shell's inner h-full layout does not always push an idle action there.
The existing header subtitle also follows the explicit UI guide. This is not a
PrimeVue limitation (the extension is Tailwind-only). The earlier source-contract
audit therefore establishes behavior/accessibility, **not full Pen parity**.

The integration owner asked whether to preserve the documented/current popup
and update the existing Pen states, or align UI/documentation to the current Pen
frames. Task 9.21 remains partial until this source-of-truth conflict is resolved;
no unauthorized layout rewrite or false pixel-parity pass was made.

### Approved presentation resolution — 13 October 2026

The user approved preserving the current popup UI and documentation and updating
the existing Pen states. The six existing popup frames listed above were updated
through Pencil and saved to `GITiempo.pen`; their IDs and surrounding grouping
remain intact. Initial loading has no issue card/Start, context and managed errors
use centered error treatment with text Retry, workspace loading disables Start,
and ready/running actions follow their content. The current branded header and
runtime Stop color are represented. Managed denial has no fallback.

The updated 320×480 screenshots were inspected for all six frames. A final live
traversal reported no layout problems. Saved roots exactly match the final live
canvas roots; excluding those roots, the document equals HEAD. The current review
PDF was refreshed. Screenshots are retained under
`/private/tmp/gitiempo-popup-updated/<frame-id>.png`.

This resolves the earlier presentation conflict. Combined with the executed
compiled-popup keyboard/overflow checks, native functional evidence and web/privacy
evidence, task 9.21 is complete. This revision changes no popup product source.

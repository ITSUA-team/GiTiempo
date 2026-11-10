<!-- Scope: extension popup UI and injected GitHub issue-page / project-pane timer UI -->
<!-- Read when: building the Chrome extension popup, injected GitHub issue-page UI, injected GitHub Projects issue-pane UI, or sharing tokens with the extension -->

# Chrome Extension UI

## Constraints

- Tailwind only. PrimeVue is not loaded.
- Keep popup bundle lightweight.
- Reuse the same design tokens by importing the shared theme CSS into the extension build.
- The extension has two surfaces: the popup and the injected timer control on supported GitHub issue surfaces.
- Use shared token utilities for status colors instead of raw hex classes in extension markup.

## Popup Layout

- Dimensions: `320 x 480px` fixed.
- Background: `bg-surface-primary`.
- Package Inter v4.1 locally with its SIL OFL license so popup typography works offline.
- Use 20px outer padding and 20px vertical gaps; keep the 42px primary action 20px from the bottom.
- In the approved account-menu frames `cvEiV` and `V6FKLq`, show the workspace row at x=20/y=68, 280px wide, using 12px text with 16px line height. The following card starts at y=104. While running, this row names the timer's original workspace; while idle, it names the selected destination.
- Use the shared destructive token `#C62828` for Stop and Sign out; `GITiempo.pen` uses the same `color-destructive` variable.
- Use the same branded header on every popup state.

## Popup Header

- Leading slot: a 28px tinted `GT` chip with 11px semibold text, followed by the 15px semibold product name with a 10px gap, matching the approved account-menu frames. The header is 28px high.
- Trailing slot, signed-in states only: a home icon that opens the User SPA home (dashboard) in a new tab, followed by the signed-in user's initials avatar.
- Resolve avatar initials from the session user, falling back to the running timer's user; omit the avatar when neither is available.
- Loading and unauthenticated states render the header without the trailing slot.

### Account Menu

- The avatar is the account trigger, matching the web apps, where the same menu opens from the avatar rather than from the logo. It reports itself expanded and takes the brand fill while open.
- Anchored under the avatar, over the state beneath. Dismissed by Escape, by a pointer outside it, or by choosing `Open profile` or `Sign out`; dismissing changes nothing underneath. Selecting a workspace keeps the panel open. Escape first dismisses an expanded native selector before dismissing the panel. When Escape reaches the popup document and the account menu is open, cancel its default popup-close action and close only the menu; leave Escape available to the host when the menu is closed. Firefox can consume Escape at the browser-action host before delivering it to the document, closing the entire popup ([Mozilla bug 1443758](https://bugzilla.mozilla.org/show_bug.cgi?id=1443758)); this host-level closure after native options dismissal was accepted by the user on 2026-10-16 and needs no workaround. The avatar toggle and outside interaction still dismiss the account menu.
- Contents, in order: the member's identity, the running-timer notice when a timer is active, a divider, the labelled `Workspace` selector, then `Open profile` and `Sign out`. The selector sits immediately above `Open profile`, matching the approved running and no-display-name frames in `GITiempo.pen`.
- At 320px popup width, the menu is 220px wide at x=80/y=56 with 6px padding and 2px gaps. Named running and email-only idle variants are 242px and 193px high respectively. Use 13px/16px name/action text, 12px/15px email/label text, and a 34px native selector; native arrow and expanded options follow the browser platform.
- Load available memberships when the menu opens. Show the accepted session's current workspace, allow selection when multiple memberships exist, and keep a single membership visible in a disabled selector. Choosing the current workspace is a no-op. Loading and switching disable the selector; a membership-load error offers Retry. Keep profile and sign-out available while switching and announce progress/errors accessibly. Preserve selection and keyboard focus through timer ticks and state updates.
- Workspace switching rotates and persists the extension's own token pair through the existing API. The chosen workspace survives popup reopening, background restart and token refresh while the session remains valid. It does not synchronize with the user/admin web-app session. A rejected target membership refreshes the options and keeps the valid current session; an invalid or uncertain session must recover authentication before tracking resumes.
- Disable timer mutations while the workspace switch is pending. Reconcile the current timer, target workspace and issue capability before enabling actions in the popup and injected controls in open tabs. An already accepted Start or Stop finishes in its original context; an old preflight cannot start a timer in another workspace.
- A running timer is global to the member across workspaces. Switching preserves its original workspace, elapsed time and Stop action; it never moves or stops the entry. After Stop, the next permitted Start uses the selected workspace. Never label an existing timer with the newly selected destination.
- Identity is the display name over the email, or **the email alone** when the snapshot carries no display name, which is the common case outside a running timer.
- When a timer is running the menu carries a one-line notice that it keeps running after sign out. Deliberately a warning and not a second clock: the popup already shows the elapsed value, and repeating it inside a panel sitting directly over it read as a second timer rather than as a warning about the first. While the menu is open that value is not readable, which is the accepted cost of anchoring the panel to the avatar.
- `Sign out` first invalidates in-flight refreshes and clears the GiTiempo session in extension storage, then attempts a bounded best-effort backend revoke using the captured credentials. Firebase's extension-local authentication persistence is cleared independently, so neither cleanup waits for the revoke before beginning. A failed Firebase cleanup leaves a credential-free pending marker and a distinct unauthenticated recovery state offers `Retry sign-out` after reopening; it shows no sign-in options or account avatar. If marker storage itself fails, both cleanups still run and the current runtime keeps the retry state while reporting that persistence failure. Recovery never restores a GiTiempo session or affects provider websites. Afterwards the popup and any injected issue control both fall back to their unauthenticated behaviour. It does **not** stop a running timer: the timer belongs to the workspace, not to the client that started it.
- No menu is reachable in the loading or unauthenticated states, which have no avatar and no session to act on.

## States

### Unauthenticated

- Product logo.
- Heading: `text-lg font-semibold text-text-dark`.
- Three sign-in actions in one hierarchy, matching the approved `Ext Unauthenticated` frame:
  - `Continue with Google` — full width, white on a divider border, carrying the Google mark.
  - `Continue with GitHub` — full width, on GitHub's own `#24292f`, carrying the GitHub mark. Shown by default; omitted only when `VITE_EXTENSION_GITHUB_SIGNIN_ENABLED` is the string `false` for the build, leaving the other two untouched.
  - `Sign in with email` — a brand text action below a labelled `or` divider, revealing the email form in place.
- The two provider actions wear their own brand marks rather than two identically brand-coloured buttons, so they read as two distinct choices. They are the same marks the web logins use.
- Starting sends one shared reference-start request with the current repository, positive issue number, bounded visible issue title, and canonical direct issue URL. External recording is default-on for an authenticated workspace member and has no personal GitHub link, installation, organization allow-list, or administrator-toggle prerequisite. The extension never exposes separate managed/external actions.
- If the server finds a managed mapping, it preserves installation, repository, mapping, and project-access checks; a denial is rendered with its returned remedy and never retried through another route. An unmapped external issue is materialized by the server as a private reference project/task with the caller's first entry.
- GitHub Projects pane URLs expose a human project number, not the canonical ProjectV2 node ID accepted by the timer API. The extension sends no board hint from that number. The server uses repository and issue identity: an existing managed mapping follows its verified route, while an unmapped issue may materialize as an external reference; an ambiguous managed mapping fails safely with its remedy.
- Google and GitHub share one interactive sign-in attempt in the background worker. Reopening the popup cannot start a second flow while that attempt is active; the popup asks the user to finish or close the existing provider window. Success, cancellation, or failure releases the guard so a later attempt can proceed.
- Google sign-in requests OpenID Connect `token id_token` with `openid email profile`, per-attempt state and nonce, and the exact configured extension redirect. Reject mismatching redirects/state/nonce, duplicate consumed security fields (`state`, `access_token`, `id_token`, `error`, `iss`) or a missing ID token. When authorization-response `iss` is present, require exactly `https://accounts.google.com`. Ignore unconsumed provider metadata such as `authuser` and `prompt`; do not treat it as identity proof. Pair the Google ID token with the Firebase credential for the immediate API exchange; the API verifies its signature, configured audience, verified email and Firebase Google-subject correspondence. Keep credentials only in attempt memory, never logs or persistent storage; configured client IDs remain separate across environments.
- GitHub sign-in is **not** Firebase-backed: it leaves for the backend flow and returns a one-time handoff code that the service worker exchanges for the ordinary session. A verified account with no memberships receives the same normal token pair after automatic `Workspace` provisioning, so the popup bootstraps without a special onboarding screen. Its failures come back as recoverable copy naming the cause, and an authorization window the user closes reads as a cancelled attempt rather than a configuration error. The legacy no-member fallback tells the user to verify their email and retry or use another sign-in method; it never says an invitation is required.
- Workspace selection is always by workspace ID. Equal workspace labels, including automatically created `Workspace` labels, remain distinct selectable memberships.

### Authenticated, No Active Timer

- Show detected issue context.
- Show the workspace name that will receive the timer. Disable Start until the authoritative session/workspace context is available, and revalidate that context at submission.
- Load the server tracking capability for the current canonical issue context alongside the current timer. Enable Start only when the capability permits it and belongs to the current issue and session. A denial displays the safe server reason; an unavailable preflight keeps Start disabled and offers Retry. Refresh capability after issue navigation, retry, or session changes, and recheck it before submission. A matching owned running timer retains Stop even when starting is denied.
- Full-width Start Timer button.
- Keep the issue context card visible above the actions.
- Reach the full workspace through the header home icon; do not repeat it as a body-level link.

### Authenticated, Unsupported Page

- Keep the branded popup shell visible.
- Show concise guidance: `Open a supported GitHub issue to start a timer.`
- Disable or hide Start Timer because issue metadata is unavailable.
- Keep a full-width action that opens the User SPA home (dashboard).

### Authenticated, Timer Running

- Elapsed time: 36px semibold, 44px line height, `text-brand`.
- Task name.
- Project/repository context.
- Full-width destructive stop button.

### Error Or Disconnected

- Inline muted message.
- Keep the branded header visible so the home icon stays reachable.
- Retry action link.
- A page-context failure uses `Unable to read issue` and `Retry` in the existing error layout. Preserve the content script's precise issue-detection error; when the script is unavailable after an extension reload, ask the member to refresh the GitHub issue page. Reserve `Connection lost` for API/session connection errors.
- Map stable tracking error codes to the relevant remedy. For `project_assignment_required`, show exactly: `You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.` Installation, organization, and repository permission failures direct the member to a workspace administrator; mapping failures direct the member to a workspace administrator or project manager; provider failures offer retry.
- Do not show a personal GitHub reconnect action for an installation-backed tracking error.
- An error after a failed start does not claim a timer is running. If the authoritative current timer belongs to this member and matches the visible issue, keep `Stop Timer` available.

## Injected GitHub Issue UI

- Register the content script on GitHub navigation entry pages so issue-list → issue transitions work without a document reload; exclude pull-request pages. Registration alone does not make a page a supported tracking surface. Require matching current rendered issue identity/title before mounting.
- The injected control appears on two supported GitHub issue surfaces:
  - direct issue pages at `github.com/<owner>/<repo>/issues/<number>`
  - GitHub Projects issue panes reached from URLs such as `github.com/orgs/<org>/projects/<number>/views/<view>?pane=issue&issue=<owner>|<repo>|<number>`
- On direct issue pages, insert it at the start of the page `main` content container so it reads as a page-local timer surface rather than a floating unrelated widget.
- On GitHub Projects issue panes, insert it immediately above the element with id `issue-viewer-sticky-header`.
- Keep the injected control visually lighter than the popup shell: no standalone `bg-surface-primary` card, border, or shadow wrapper.
- Match the injected issue header and helper-copy text color to the active GitHub page theme: use `text-text-inverse` and `text-text-inverse-muted` on GitHub dark mode and dark/muted token text on GitHub light mode, while keeping action colors aligned with extension tokens such as `bg-brand`, `text-brand`, and `bg-destructive`.
- On GitHub Projects issue panes, keep the vertical spacing tighter than the direct issue-page version so the control reads as part of the pane stack rather than as a page section.

### Injected Idle State

- Show repository and issue number/title detected from the current page.
- Show one primary `Start Timer` action.
- Show the authenticated workspace destination above the action. Disable duplicate clicks while Start is pending, re-read current DOM issue context before submission, and keep the current issue context visible after an error.
- If auth is missing, keep issue context visible, replace the primary action with `Open extension`, and show helper copy: `Sign in to GiTiempo to start tracking this issue.`

### Injected Running State

- Show a compact running indicator with live `HH:MM:SS`.
- Keep the same GitHub issue context visible.
- When the backend current-timer response includes stable GitHub issue linkage matching the current page, show a destructive `Stop Timer` action.
- When the backend reports a current timer for another issue or without stable GitHub linkage, show the authoritative task/project context and guide the user to `Open extension` for global timer management.

### Injected Error State

- Keep the issue context visible so the user knows what page the action applies to.
- Show concise inline error copy.
- Show a `Retry` action without replacing the entire issue-page control shell.
- Use the same stable-code remedy and exact assignment copy as the popup. Preserve an authoritative matching `Stop Timer` action after a failed start.

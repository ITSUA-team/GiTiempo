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
- Use the same branded header on every popup state.

## Popup Header

- Leading slot: the GiTiempo logo chip, product name, and `GitHub timer` subtitle.
- Trailing slot, signed-in states only: a home icon that opens the User SPA home (dashboard) in a new tab, followed by the signed-in user's initials avatar.
- Resolve avatar initials from the session user, falling back to the running timer's user; omit the avatar when neither is available.
- Loading and unauthenticated states render the header without the trailing slot.

## States

### Unauthenticated

- Product logo.
- Heading: `text-lg font-semibold text-text-dark`.
- Primary `Sign in with Google` button using brand tokens.
- Secondary `Sign in with email` action using the same popup shell and token language.

### Authenticated, No Active Timer

- Show detected issue context.
- Full-width Start Timer button.
- Keep the issue context card visible above the actions.
- Reach the full workspace through the header home icon; do not repeat it as a body-level link.

### Authenticated, Unsupported Page

- Keep the branded popup shell visible.
- Show concise guidance: `Open a supported GitHub issue to start a timer.`
- Disable or hide Start Timer because issue metadata is unavailable.
- Keep a full-width action that opens the User SPA home (dashboard).

### Authenticated, Timer Running

- Elapsed time: `text-2xl font-semibold text-brand`.
- Task name.
- Project/repository context.
- Full-width destructive stop button.

### Error Or Disconnected

- Inline muted message.
- Keep the branded header visible so the home icon stays reachable.
- Retry action link.

## Injected GitHub Issue UI

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

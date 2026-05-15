<!-- Scope: extension popup UI and injected GitHub issue-page timer UI -->
<!-- Read when: building the Chrome extension popup, injected GitHub issue-page UI, or sharing tokens with the extension -->

# Chrome Extension UI

## Constraints

- Tailwind only. PrimeVue is not loaded.
- Keep popup bundle lightweight.
- Reuse the same design tokens by importing the shared theme CSS into the extension build.
- The extension has two surfaces: the popup and the injected timer control on GitHub issue pages.

## Popup Layout

- Dimensions: `320 x 480px` fixed.
- Background: `bg-surface`.
- Use the same branded header on every popup state.

## States

### Unauthenticated

- Product logo.
- Heading: `text-lg font-semibold text-text-dark`.
- Primary sign-in button using brand tokens.

### Authenticated, No Active Timer

- Show detected issue context.
- Full-width Start Timer button.
- Link to open the full User SPA.
- Keep the issue context card visible above the actions.

### Authenticated, Timer Running

- Elapsed time: `text-2xl font-semibold text-brand`.
- Task name.
- Project/repository context.
- Full-width destructive stop button.

### Error Or Disconnected

- Inline muted message.
- Retry action link.

## Injected GitHub Issue Page UI

- The injected control appears on `github.com/<owner>/<repo>/issues/<number>` pages.
- Place it near the issue header/content actions so it reads as a page-local timer surface rather than a floating unrelated widget.
- Match the extension token language: `bg-surface`, `border-divider`, `text-text-dark`, `text-text-muted`, `bg-brand`, `text-brand`, `text-destructive`.

### Injected Idle State

- Show repository and issue number/title detected from the current page.
- Show one primary `Start Timer` action.
- If auth is missing, replace the primary action with `Open extension` or equivalent sign-in guidance.

### Injected Running State

- Show a compact running indicator with live `HH:MM:SS`.
- Keep the same GitHub issue context visible.
- Show one destructive `Stop Timer` action.

### Injected Error State

- Keep the issue context visible so the user knows what page the action applies to.
- Show concise inline error copy.
- Show a retry action without replacing the entire issue-page control shell.

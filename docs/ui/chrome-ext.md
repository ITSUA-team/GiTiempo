<!-- Scope: extension popup UI only -->
<!-- Read when: building the Chrome extension popup or sharing tokens with the extension -->

# Chrome Extension UI

## Constraints

- Tailwind only. PrimeVue is not loaded.
- Keep popup bundle lightweight.
- Reuse the same design tokens by importing the shared theme CSS into the extension build.

## Popup Layout

- Dimensions: `320 x 480px` fixed.
- Background: `bg-surface`.

## States

### Unauthenticated

- Product logo.
- Heading: `text-lg font-semibold text-text-dark`.
- Primary sign-in button using brand tokens.

### Authenticated, No Active Timer

- Show detected issue context.
- Full-width Start Timer button.
- Link to open the full User SPA.

### Authenticated, Timer Running

- Elapsed time: `text-2xl font-semibold text-brand`.
- Task name.
- Full-width destructive stop button.

### Error Or Disconnected

- Inline muted message.
- Retry action link.

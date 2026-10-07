# Extension parity checklist

- Popup remains the approved 320 × 480 surface with its branded header and current-issue context card.
- Direct GitHub issue controls remain at the start of `main`; Projects controls remain immediately above `#issue-viewer-sticky-header` with the tighter pane spacing.
- Both controls retain issue context during start failures and render inline recovery copy with a retry action.
- Installation, policy, permission, mapping, and provider failures use their stable server code and safe shared message. No error state suggests reconnecting a personal GitHub account.
- A running timer keeps its authoritative stop action visible when a later GitHub start fails. The stop request retains its expected timer ID.
- Injected controls keep token-based light and dark text colors and avoid a standalone card, border, or shadow.

## 1. Shared Helpers

- [x] 1.1 Add a browser-safe access-token payload decode and string-claim read to `packages/shared`.
- [x] 1.2 Add a profile-initials helper to `packages/shared` using the established SPA rule.
- [x] 1.3 Consume both helpers from `packages/web-shared` so the SPA keeps a single implementation.
- [x] 1.4 Add shared tests for claim decoding edge cases and initials derivation.

## 2. Extension Configuration

- [x] 2.1 Derive `userSpaHomeUrl` from the origin of the configured User SPA URL without adding an environment variable.
- [x] 2.2 Add configuration tests covering the derived home URL in relaxed and production modes.

## 3. Runtime Snapshot Identity

- [x] 3.1 Add the signed-in user to the runtime snapshot as a required nullable field.
- [x] 3.2 Populate it in the background from the session token email, upgraded with a running timer's display name.
- [x] 3.3 Keep the popup and content-script fallback snapshots aligned with the field.
- [x] 3.4 Add background tests asserting the snapshot carries the decoded user and stays null without a session.

## 4. Popup Header

- [x] 4.1 Add a home action to the popup header that opens the User SPA home in a new tab for signed-in states.
- [x] 4.2 Render the signed-in user's initials avatar beside it, omitting the avatar when identity is unavailable.
- [x] 4.3 Keep loading and unauthenticated states free of the home action and avatar.
- [x] 4.4 Remove the body-level workspace link from the detected-issue state and point the unsupported-page action at the app home.
- [x] 4.5 Read the header user from the snapshot rather than re-deriving it from the running timer.
- [x] 4.6 Add popup tests for the header home action and for the avatar in both the no-timer and running-timer states.

## 5. Docs And Design

- [x] 5.1 Update `docs/ui/chrome-ext.md` to describe the shared popup header once instead of per state.
- [x] 5.2 Update the `GITiempo.pen` extension frames with the header home icon and user avatar.

## 6. Verification

- [x] 6.1 Run `pnpm --filter chrome-ext typecheck`.
- [x] 6.2 Run `pnpm --filter chrome-ext test`.
- [x] 6.3 Run `pnpm --filter chrome-ext build`.
- [x] 6.4 Run `pnpm --filter @gitiempo/shared test` and `pnpm --filter web-shared test` for the shared helpers.
- [x] 6.5 Run `pnpm --filter user-web typecheck` and `pnpm --filter admin-web typecheck` because `packages/shared` changed.
- [x] 6.6 Confirm no API, OpenAPI, database, or shared contract-schema changes were introduced.

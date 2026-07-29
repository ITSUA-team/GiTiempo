## Why

The extension popup had no dependable way back into the GiTiempo web app. The only entry point was a body-level text link on one popup state, and it opened the sign-in route rather than the app home, so an already signed-in user landed on a login page. The popup also never said whose session it was using: the user badge appeared in a single state and vanished while a timer was running, which is precisely when the user is most likely to check that they are tracking under the right account.

Reported by a teammate as: can the extension window offer a button or link into the app itself?

## What Changes

- Add a home action to the popup header for every signed-in state, opening the User SPA home (dashboard) rather than the sign-in route.
- Derive the home destination from the origin of the configured User SPA URL so it follows the deployed environment.
- Show the signed-in user's initials avatar in the popup header across signed-in states, including while a timer is running and in the disconnected state.
- Carry the signed-in user on the extension runtime snapshot so every popup state has the same identity, sourced from the session token and enriched with the running timer's display name.
- Remove the body-level workspace link from the detected-issue state, now that the header carries the affordance, and point the unsupported-page action at the app home.
- Keep the loading and unauthenticated states free of the home action and avatar.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chrome-extension`: adds a persistent popup entry point into the web app home and a signed-in user indicator, and extends the runtime snapshot with the signed-in user consumed by the popup header.

## Impact

- Affected app: `apps/chrome-ext`.
- Affected packages: `packages/shared` gains browser-safe access-token claim and profile-initials helpers; `packages/web-shared` reuses the shared initials helper so SPA and extension headers label a user identically.
- Affected source-of-truth: `openspec/specs/chrome-extension/spec.md` through this change's delta spec, `docs/ui/chrome-ext.md`, and the approved `GITiempo.pen` extension frames.
- API/contracts: no backend endpoint, OpenAPI, or database changes. The signed-in email is read from the already-stored access token; no new request is issued.
- Deployment: no new environment variable. `VITE_EXTENSION_USER_SPA_URL` now also supplies the home origin.

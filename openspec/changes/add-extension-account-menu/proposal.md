## Why

The extension can get a member signed in but never signed out. Once a session is stored there is no way to end it from the popup: the only exits are an expired refresh token or clearing extension storage by hand. On a shared or handed-over machine that is the wrong default, and it is the one account action every other GiTiempo surface offers.

The popup also has no route to the member's own profile. The header carries a home action to the dashboard, and the avatar beside it — which the web apps use as the account-menu trigger — currently does nothing at all. It identifies the signed-in user and stops there.

Both gaps close in the same place: give that avatar the menu the web app already puts behind it.

## What Changes

- Make the popup's header avatar an **account menu trigger** in every signed-in state. Activating it opens a small panel over the popup surface; dismissing it returns to the state underneath unchanged.
- The panel offers exactly two actions, as requested: **open the profile page** in the user web app, and **sign out**. It also names the signed-in member, so the menu answers "who am I" before it offers to end the session.
- **Sign out** revokes the session with the backend and then clears extension storage, mirroring `logout()` in `packages/web-shared`: a failed revoke still clears locally, because leaving a session the user asked to end is worse than leaving a token to expire on the server.
- After signing out the popup returns to its unauthenticated state and the injected GitHub issue control loses its authenticated actions, through the snapshot broadcast the extension already performs after every mutation.
- Add a profile URL to the extension config beside the existing `userSpaHomeUrl`, so one module keeps the knowledge of which user-web routes the extension links to.
- The panel is drawn and approved in `GITiempo.pen` **before** any popup markup changes.
- **BREAKING**: none. No API change — `POST /auth/logout` already exists and is unchanged — no new environment variable, no storage-shape change, and the header keeps the home action and the avatar it shows today.

## Capabilities

### New Capabilities

None. This gives an existing header element behaviour and adds the missing half of an existing authentication capability.

### Modified Capabilities

- `chrome-extension`: the capability gains two requirements, and **no existing requirement text changes**. The header requirement already says the avatar identifies the signed-in user, which stays true once it also opens a menu; and the workspace-session requirement covers establishing, refreshing, and losing a session, but never deliberately leaving one, so ending a session is a new concern rather than a changed one. Both are therefore added rather than modified.

## Impact

- **Extension** (`apps/chrome-ext`): the popup header and its render/bind cycle, a menu-open flag on popup state, a sign-out action through the runtime client and service worker, an `exitSession` client method, and `lib/config.ts` for the profile URL.
- **Backend** (`apps/api`): none. The existing logout endpoint takes the refresh token and the bearer session, both of which the extension already holds.
- **Design**: the account menu over the signed-in popup states in `GITiempo.pen`, approved before implementation.
- **Docs**: `docs/ui/chrome-ext.md` for the header's new behaviour and the menu's contents.
- **Out of scope**: workspace switching (the popup has no workspace concept), settings, and any change to the home action or to how sessions are established. Stopping a running timer on sign-out is deliberately excluded — see `design.md`.

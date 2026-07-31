## Context

The popup renders by assigning `innerHTML` on every state change and re-binding listeners afterwards, so anything that stays open across a re-render has to live on popup state. `showEmailForm` already works this way, which gives the menu an existing pattern to follow rather than a new one to invent.

The header is shared by all signed-in states through `renderBrandHeader({ authenticated, user })`, which composes `renderHomeButton()` and `renderUserAvatar(user)`. The avatar is a `<div>` carrying initials and a `title`; it takes no interaction today. The popup is a fixed 320×480 surface, Tailwind-only, with no PrimeVue, Router, or Pinia available — so the menu is hand-rolled, unlike the web app's PrimeVue `Menu`.

Two backend facts shape the sign-out path. `POST /auth/logout` takes `{ refreshToken }` **and** a bearer access token, both of which the extension holds; and it answers `204` with no body, which the extension's `requestWithAuth` cannot consume as-is because it parses a response schema. `packages/web-shared`'s `logout()` sets the precedent for ordering: revoke the API session, then clear locally, and clear locally even when the revoke throws.

`apps/chrome-ext/AGENTS.md` keeps the extension runtime independent of the SPAs, limits shared imports to browser-safe contract and token surfaces, and names the approved `GITiempo.pen` extension frames as the source of truth for visual requirements.

## Goals / Non-Goals

**Goals:**

- Let a member end their extension session from the popup, and reach their profile page.
- Leave the session state consistent afterwards across popup, service worker, and any injected issue control.
- Keep the account gesture the same one the web apps use, so the two surfaces do not disagree about what the avatar means.

**Non-Goals:**

- Workspace switching or settings. The popup has no workspace concept, and the menu is deliberately two actions, not a port of the web menu.
- Any change to how sessions are established, refreshed, or to the home action beside the avatar.
- Stopping a running timer as part of signing out (D5).
- A menu in the unauthenticated state, which has no avatar and no session to act on.

## Decisions

### D1: The trigger is the avatar, not the logo

The request named the logo. The avatar is used instead, because `WorkspaceHeader.vue` already opens the account menu from the avatar with the label `Open profile menu for {displayName}`, and that menu already ends in `Sign out`.

- *Rationale*: the two surfaces would otherwise disagree about which glyph is the account. The avatar is also the element that currently does nothing while looking like a control, so the menu gives meaning to something already present rather than adding interactivity to a brand mark.
- *Alternative rejected*: the logo, as literally asked. It makes the brand mark interactive while leaving the avatar beside it dead, which is the arrangement most likely to be misread by both users and the next maintainer.
- *Alternative rejected*: logo and avatar together as one hit area. Easier to hit in a 320px header, but the boundary of what is clickable stops being visible, and a wide invisible target next to the home action invites mis-taps.

### D2: An anchored panel, not a full-surface overlay

The menu renders as a small panel positioned under the avatar, over the state beneath, dismissed by `Escape`, by activating an item, or by pointer-down outside it.

- *Rationale*: "modal" was the word used, and at 320×480 the distinction is mostly academic. An anchored panel matches how the web menu behaves and keeps the gesture where the trigger is.
- *Corrected once drawn*: the original rationale claimed an anchored panel keeps the running timer visible. **It does not, and cannot.** Measured in `GITiempo.pen`: the panel occupies y 56–270 while the status card occupies 68–241, so a panel of usable width under a top-right avatar covers the whole timer — tag, elapsed digits, task, and meta. There is no size that both fits two actions plus an identity and clears the middle band, because the trigger is at the top and the timer is in the centre.
- *Resolution, revised after review*: the panel carries a **warning**, not a second clock. It was first built to repeat the elapsed value and task, on the reasoning that relocating the context beats hiding it; in the running popup that read as a second timer sitting on top of the first rather than as a warning about it, and the duplication was removed.
- *Cost, stated rather than argued away*: while the menu is open the elapsed value is not readable. What matters before signing out is knowing the timer will keep running, and the panel says exactly that; the value itself is one dismissal away. That is a real cost of the anchored position, not something the design gets for free.
- *Alternative rejected*: floating the panel into the empty band below the card (y 241–418) so nothing is covered. Nothing is covered, but a menu that appears in the middle of the popup while the control that opened it sits in the corner reads as an unrelated dialog.
- *Note*: no focus trap. A focus trap needs somewhere to trap focus *from*, and the popup is the whole window; `Escape` plus dismiss-on-outside-pointer is the behaviour a two-item menu needs, and it is what a keyboard user will reach for.

### D3: Sign-out revokes first, then always clears

`exitSession` reads the stored pair, clears extension storage, and then revokes best-effort. A failed, refused, or timed-out revoke changes nothing about the local clear, which has already happened.

- *Rationale*: the property `logout()` in `packages/web-shared/src/auth/session-core.ts` protects — the local session goes whatever the server said — is kept, and strengthened. Skipping the revoke would leave a usable token behind after the user asked to be signed out, so the pair is read before the clear and revoked after it.
- *Order corrected after review*: revoking first put an unbounded request in front of the clear, so a stalled network or a terminated service worker could leave the session stored. Reading the pair first means clearing early costs nothing, and it makes the local sign-out unconditional rather than conditional on the network.
- *Consequence*: the revoke cannot go through `requestWithAuth`, which parses a response schema and would choke on `204`. It needs a small authenticated request that tolerates an empty body — a third shape beside `establishSession` and `requestWithAuth`, and the narrowest of the three.
- *Alternative rejected*: clearing storage only. It is one line and it is what a naive sign-out does; it also means the refresh token stays valid for its full TTL, which is the difference between signing out and hiding the session.

### D4: The menu closes through popup state, like the email form

An `isAccountMenuOpen` flag on popup state, read by the header renderer and reset on sign-out and on dismiss.

- *Rationale*: the popup re-renders `innerHTML` and re-binds on every snapshot update, so anything holding open state in the DOM would be destroyed by the next one. `showEmailForm` already established the flag.
- *Amended during implementation*: this originally said the rebuild also happened on every timer tick, once a second. It did, and it made an open menu item pulse under a stationary cursor — each replacement started un-hovered and transitioned back. The ticker now advances the elapsed text in place instead of re-rendering, so a tick rebuilds nothing. The flag is still required, because a snapshot update does re-render in full.

### D5: Signing out does not stop a running timer

The menu is offered in the running state and does not touch the timer.

- *Rationale*: the timer belongs to the workspace, not to the client that started it, and the web app does not stop timers on logout either. Silently ending someone's tracked time because they left a browser would destroy data they cannot recover.
- *Trade-off, stated plainly*: a member can sign out with a timer running and then have no visible sign it is still running until they sign back in or open the web app. That is a real hole, and the honest fix is telling them — the menu carries `Timer keeps running after sign out` whenever a timer is active, rather than silently doing something irreversible in either direction.

### D6: The profile URL is derived once, in config

`lib/config.ts` gains `userSpaProfileUrl` beside `userSpaHomeUrl`, both resolved from `VITE_EXTENSION_USER_SPA_URL`.

- *Rationale*: `deriveHomeUrl` already reduces the configured sign-in URL to its origin, and the same assumption — the user SPA is served from the root of that origin — is what a profile path depends on. Putting the second route beside the first keeps that assumption in one module instead of letting the popup concatenate paths at the call site.
- *Alternative rejected*: a new environment variable. It would be a third setting describing the same origin, and this repository has explicitly pushed back on settings that restate what another already says.

## Planned File Changes

**`apps/chrome-ext`** — verification per `apps/chrome-ext/AGENTS.md`: `pnpm --filter chrome-ext typecheck`, `test`, and `build`.

- `src/lib/config.ts`: `userSpaProfileUrl`, ordered beside `userSpaHomeUrl`.
- `src/lib/api.ts`: an `exitSession()` method that revokes then clears, tolerating both a failed revoke and an empty `204` body.
- `src/lib/runtime.ts`: a `signOut()` client method and its `auth/sign-out` message.
- `src/background/main.ts`: the handler, going through the existing mutation wrapper so the snapshot is rebuilt and broadcast.
- `src/popup/main.ts`: the avatar becomes a `<button>` with `aria-expanded`, the menu panel renders from `isAccountMenuOpen`, and the dismiss and item handlers join `bindEvents`.

**`apps/api`** — no changes.

**`GITiempo.pen`** — the account menu over the signed-in popup states, approved before implementation.

**Docs** — `docs/ui/chrome-ext.md` for the header's behaviour and the menu's two items.

## Backend / Extension Coordination

One touch point, an endpoint that already exists: `POST /auth/logout` with the stored refresh token and the bearer access token. Nothing about the request or response changes, so the two layers can ship independently and in either order.

Everything else is extension-local. Nothing crosses `packages/web-shared`, which the extension may not import; the only shared surface is the existing `logoutRequestSchema` from `packages/shared`, reused rather than restated.

## Risks / Trade-offs

- **A timer keeps running after sign-out** → D5. Named in the menu rather than silently stopped or silently ignored.
- **The popup re-renders every second while a timer runs** → an open menu would flicker or close if it lived anywhere but state (D4). Worth a test that the menu survives a snapshot tick, since this is the failure a reviewer cannot see in a screenshot.
- **Sign-out races an in-flight refresh** → ~~not worth new coordination~~. **That assessment was wrong and is corrected here.** It assumed the refresh would store a pair the next request rejects. The backend *rotates* on refresh, so a logout revokes the row the in-flight refresh had already replaced, and the rotated pair stays valid: storing it hands the session back after the user ended it. Sign-out now bumps a session epoch that a refresh captures before leaving; a refresh whose epoch changed revokes its rotation instead of storing it. Regression-tested.
- **A revoke that hangs** → the local clear no longer waits on it at all. Storage is cleared first and unconditionally, and the revoke follows best-effort under a 5-second `AbortSignal.timeout`, because inheriting the client's error handling still left an unbounded request standing between the user asking to sign out and the session going.
- **The profile route could move** → the extension links to a user-web path it does not own. D6 keeps that assumption in one module, and the existing home action already carries the same coupling.
- **Two actions in a menu invite a third** → workspace switching and settings are explicitly out of scope in the proposal, so the next person adding one has to argue for it rather than assume it belongs.

## Migration Plan

Nothing persisted, nothing configured, no migration. Steps: (1) approve the `.pen` panel; (2) ship the extension. Rollback is shipping the previous build — the endpoint it calls is unchanged and predates this work, and sessions established before or after behave identically.

## Open Questions

- Should the menu name the signed-in member by display name, email, or both? The snapshot carries the email always and a display name only while a timer supplies one, so the design frame decides what the header shows when there is no display name.
- Does the profile page need a `?from=extension` marker for analytics? Not added, since nothing asked for it and it would be a second consumer of a URL shape the extension does not own.

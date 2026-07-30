## 1. Design first (blocks all popup work)

- [x] 1.1 Open `GITiempo.pen` in the Pencil editor. The file cannot be read or edited headlessly, so all `.pen` work in this change happens in one editing session.
- [x] 1.2 Draw the account menu over the signed-in popup states, anchored under the header avatar. Decide what the menu shows as the member's identity when the snapshot carries an email but no display name, which is the common case outside a running timer. — **Resolved: the email alone.** Built as reusable `Ext Account Menu` (`vzO0K`) with the name line as a separately disableable node, instanced twice: `Ext Account Menu — Running` shows name over email, `Ext Account Menu — No Display Name` disables the name and shows the email as the sole identity line. The panel shrinks from 180 to 118 tall in that variant, so nothing is left holding empty space.
- [x] 1.3 Decide how the menu names a running timer, since signing out leaves it running (design D5). This is the one place the design has to prevent a surprise rather than just present two actions. — **Resolved: the panel carries the timer.** Its running block shows the elapsed time (`01:42:18`), the task, and `Keeps running after sign out`, on the active-status tint. A generic sentence was the first attempt and was replaced, because it warned about a timer the panel had just covered.
- [x] 1.4 Check the panel against the 320×480 surface with the longest realistic email, and confirm it does not cover the running timer it is anchored above. — **It does cover it, and no anchored size avoids that.** Measured: panel y 56–270 against a status card at 68–241, so tag, digits, task, and meta all disappear behind it. The trigger is top-right and the timer is centre, so there is no geometry that fits an identity plus two actions and clears the middle band. D2 is corrected in `design.md` and the overlap is made harmless by 1.3 rather than pretended away. The longest-email check passes: `alexey@example.com` fits the 220px panel on one line with room to spare.
- [ ] 1.5 Get the frame approved before any popup markup changes, per `apps/chrome-ext/AGENTS.md`, which names the approved `.pen` extension frames as the source of truth for visual requirements.

## 2. Extension: config and session exit

- [ ] 2.1 Add `userSpaProfileUrl` to `apps/chrome-ext/src/lib/config.ts`, resolved from `VITE_EXTENSION_USER_SPA_URL` beside the existing `userSpaHomeUrl`, so both user-web routes the extension links to are derived in one module. No new environment variable.
- [ ] 2.2 Add `exitSession()` to `src/lib/api.ts`: post the stored refresh token to `POST /auth/logout`, then clear extension storage. It cannot reuse `requestWithAuth`, which parses a response schema and would choke on the endpoint's `204`; it needs the narrowest authenticated request of the three shapes in that file, tolerating an empty body.
- [ ] 2.3 Swallow a failed revoke and clear locally anyway, matching `logout()` in `packages/web-shared/src/auth/session-core.ts`. Reuse `logoutRequestSchema` from `packages/shared` rather than restating the body shape.
- [ ] 2.4 Add `signOut()` to the runtime client and an `auth/sign-out` message, handled in `src/background/main.ts` through the existing mutation wrapper so the snapshot is rebuilt and broadcast to the popup and to any injected control.

## 3. Extension: the account menu

- [ ] 3.1 Turn the header avatar into a `<button>` carrying `aria-expanded` and a label naming the action, and keep the initials, title, and appearance the header already specifies.
- [ ] 3.2 Hold the open state as `isAccountMenuOpen` on popup state, not in the DOM. The popup re-renders `innerHTML` every second while a timer runs, so DOM-held state would be destroyed by the next tick; `showEmailForm` is the existing precedent.
- [ ] 3.3 Render the panel per the frame approved in 1.5: the member's identity, the profile action, and sign out, and nothing else.
- [ ] 3.4 Close the menu on escape, on pointer-down outside it, and on choosing an action, resetting the flag in each case so a re-render cannot resurrect it.
- [ ] 3.5 Wire the profile action to open `userSpaProfileUrl` in a new tab, with the same `target`/`rel` treatment the header's home action already uses.
- [ ] 3.6 Wire sign out to the runtime client, then let the broadcast snapshot return the popup to its unauthenticated state rather than setting that state by hand.

## 4. Extension tests

- [ ] 4.1 `popup/main.spec.ts`: the avatar opens the menu and reports `aria-expanded`; the menu offers exactly the two actions; the header home action stays reachable while it is open.
- [ ] 4.2 `popup/main.spec.ts`: the menu closes on escape, on an outside pointer, and on choosing an action, and dismissing it leaves the state beneath unchanged.
- [ ] 4.3 `popup/main.spec.ts`: an open menu survives a snapshot tick while a timer runs. This is the regression a screenshot cannot show and the one D4 exists to prevent.
- [ ] 4.4 `popup/main.spec.ts`: no menu is reachable in the loading or unauthenticated states.
- [ ] 4.5 `popup/main.spec.ts`: signing out reaches the runtime client, and the popup follows the broadcast snapshot to the unauthenticated state.
- [ ] 4.6 `lib/api.spec.ts`: `exitSession` posts the refresh token to the logout endpoint and clears storage; a rejected revoke still clears; a `204` with no body is not treated as a failure.
- [ ] 4.7 `lib/config.spec.ts`: `userSpaProfileUrl` is derived from the same origin as `userSpaHomeUrl`, including when the configured sign-in URL carries a path or a trailing slash.

## 5. Docs

- [ ] 5.1 Update `docs/ui/chrome-ext.md`: the header avatar opens an account menu, what the menu contains, and that signing out leaves a running timer running. Describe the header once rather than per state, as that file already does.

## 6. Verification

- [ ] 6.1 `pnpm --filter chrome-ext typecheck`, `test`, and `build`, per `apps/chrome-ext/AGENTS.md`.
- [ ] 6.2 Confirm the extension still imports nothing from `packages/web-shared` and no PrimeVue, Vue Router, Pinia, or SPA bootstrap module.
- [ ] 6.3 Confirm no API change was needed: `POST /auth/logout` is untouched and `packages/shared/openapi.json` is unchanged by this work.

## 7. Manual verification

- [ ] 7.1 In a loaded extension: open the menu from the avatar in each signed-in state, open the profile page, then sign out and confirm the popup and an injected issue control both fall back to their unauthenticated behaviour.
- [ ] 7.2 Sign out while a timer runs, then open the web app and confirm the timer is still running — the outcome D5 accepts, verified rather than assumed.

## 8. Close out

- [ ] 8.1 After verification, archive this OpenSpec change.

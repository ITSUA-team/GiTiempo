## Context

The login route renders a split page: a branded intro panel on the left and the sign-in form on the right. The redesigned `Login Page` `.pen` screen adds one element to the **left** panel — a callout card with a puzzle icon, the title `Browser extension`, the line `Track time right from your browser`, and a forward arrow — sitting directly below the feature cards and above the badge/counterpart footer row.

Constraints that shape the approach:

- The left panel is `AuthIntroPanel` in `packages/web-shared`, shared by the user and admin login views, and it is props-only with no slots today.
- Both logins show the callout; the register screens do not.
- The extension is not published to the Chrome Web Store yet — `apps/chrome-ext/README.md` documents load-unpacked installation — so the install page is unknown until it is.
- `apps/user-web` has no outbound product destination today; its only cross-app value is `VITE_ADMIN_APP_URL`.

## Goals / Non-Goals

**Goals:**

- Tell a signing-in user that the browser extension exists, at the moment they are already in a browser.
- Send them to the install page, without derailing an in-progress sign-in.
- Degrade to nothing in environments where the destination is unknown.
- Bring `docs/ui/pages-user.md` back in line with the redesigned auth screens.

**Non-Goals:**

- No extension install flow, detection of an already-installed extension, or store submission.
- No callout on the register or invite screens.
- No API, contract, or database work.

## Decisions

**Carry the callout through an optional slot on `AuthIntroPanel`, not new props.** The panel is shared, and the register and invite screens must stay without a callout. A slot leaves the panel a neutral extension point, and a screen that fills nothing renders nothing. *Alternative considered:* optional `extensionCallout*` props — rejected because it would force every screen using the panel to reason about a concept most of them do not have.

**Share the callout and its link resolver once both logins needed them.** The markup and the URL handling live in `packages/web-shared` rather than being copied per app, so the two logins cannot drift into showing different cards or accepting different values.

**One configured destination, not a chain of fallbacks.** The callout points at the extension install page and nothing else. An earlier draft fell back to a landing section while the store listing did not exist, which meant a second environment value and two ways for the same link to resolve — configuration nobody could reason about from the login page alone. Until the extension is published the value stays unset and the callout simply does not render.

**Accept only an absolute http(s) address.** The install page lives on another site. Resolving a relative or malformed value against the app's own origin would produce a same-origin link that lands back in the app, which is a support ticket rather than a visible failure.

**Configure the destination as `VITE_EXTENSION_INSTALL_URL`, mirroring `VITE_ADMIN_APP_URL`.** Cross-app destinations in this SPA are already build-time `VITE_*` origins rather than hardcoded hosts, because each app deploys to its own Cloudflare origin per environment.

**Render nothing when the value is absent, rather than falling back to a default host.** A wrong-origin link on the login page is a support problem; an absent callout is invisible. This also keeps local development honest — a developer who has not set the value sees exactly what an unconfigured environment sees. The value is therefore optional, unlike the required Firebase and API settings.

**Open in a new tab.** The callout shares the page with a form the user may be part-way through. Navigating away in place would discard entered credentials; `target="_blank"` with `rel="noreferrer"` keeps the sign-in tab intact.

## Risks / Trade-offs

- **A shared component grows a slot for one consumer** → mitigated by keeping the slot neutral and unnamed-for-purpose: it is an intro-panel extension point, not an "extension callout" slot, so a later admin-side addition can reuse it rather than adding a second one.
- **One more environment value to set per deployment** → mitigated by making it optional: an unset value costs a hidden callout, not a broken build, unlike the required `VITE_*` settings that fail fast.
- **The callout could drift into looking like a sign-in action** → it lives in the opposite panel from the form, and the specs pin it as staying outside the sign-in form, so a future restyle cannot quietly promote it.

## Migration Plan

Additive and reversible. No data, contract, or route changes, and the shared-component change is a new optional slot, so `apps/admin-web` needs no update. Deploying without setting `VITE_EXTENSION_INSTALL_URL` yields today's login page exactly; setting it turns the callout on. Rollback is unsetting the value or reverting the view change.

## Open Questions

- Should the callout also appear on the register screen once its design is approved? The current `.pen` screens place it on login only, so this change follows the design and leaves register untouched.

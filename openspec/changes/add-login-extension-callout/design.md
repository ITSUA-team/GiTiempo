## Context

The login route renders a split page: a branded intro panel on the left and the sign-in form on the right. The redesigned `Login Page` `.pen` screen adds one element to the **left** panel — a callout card with a puzzle icon, the title `Browser extension`, the line `Track time right from your browser`, and a forward arrow — sitting directly below the feature cards and above the badge/counterpart footer row.

Constraints that shape the approach:

- The left panel is `AuthIntroPanel` in `packages/web-shared`, shared by the user and admin login views, and it is props-only with no slots today.
- The approved screens place the callout on the user login only: the admin login and both register screens have none.
- The extension is not published to the Chrome Web Store — `apps/chrome-ext/README.md` documents load-unpacked installation — so there is no store URL to link to.
- `apps/landing-web` already describes the extension in its product section and ships as a separate Cloudflare Workers deployment with its own origin.
- `apps/user-web` has no landing URL today; its only cross-app destination is `VITE_ADMIN_APP_URL`.

## Goals / Non-Goals

**Goals:**

- Tell a signing-in user that the browser extension exists, at the moment they are already in a browser.
- Send them somewhere that explains it, without derailing an in-progress sign-in.
- Degrade to nothing in environments where the destination is unknown.
- Leave the admin login untouched.
- Bring `docs/ui/pages-user.md` back in line with the redesigned auth screens.

**Non-Goals:**

- No extension install flow, detection of an already-installed extension, or store submission.
- No callout on the admin login, register, or invite screens.
- No new landing page section or landing code change.
- No API, contract, or database work.

## Decisions

**Carry the callout through an optional slot on `AuthIntroPanel`, not new props.** The panel is shared with the admin login, which must not show the callout. A slot keeps the extension concept entirely inside `apps/user-web` — the shared component gains a neutral extension point and never learns what a browser extension is — and an app that passes nothing renders nothing, so admin is unchanged by construction. *Alternative considered:* optional `extensionCallout*` props — rejected because it moves user-app product vocabulary into a shared auth component, and every future tweak to the callout would then reach across a package boundary.

**Link to the landing rather than the Chrome Web Store.** The store listing does not exist yet, and shipping a dead or placeholder link on the login page is worse than shipping nothing. The landing already carries the extension narrative and is the page the product markets. When the extension is published, the landing section can gain a store button and the login callout keeps working unchanged. *Alternative considered:* a store URL behind a feature flag — rejected because it adds a flag whose only state today is "off".

**Target the existing extension content anchor on the landing.** The landing's product section already contains the extension copy under a stable element id, so the callout can deep-link to it with no landing change. *Alternative considered:* adding a dedicated `#extension` section anchor — deferred, because it would couple this change to `add-public-landing-page`, which is still in flight. If a dedicated section later appears, only the anchor constant moves.

**Resolve the destination in one place.** The anchor and the configured origin are combined by a single helper so the view never concatenates URL fragments, and the "which section on the landing" decision has exactly one call site to update.

**Configure the destination as `VITE_LANDING_URL`, mirroring `VITE_ADMIN_APP_URL`.** Cross-app destinations in this SPA are already build-time `VITE_*` origins rather than hardcoded hosts, because each app deploys to its own Cloudflare origin per environment.

**Render nothing when the value is absent, rather than falling back to a default host.** A wrong-origin link on the login page is a support problem; an absent callout is invisible. This also keeps local development honest — a developer who has not set the value sees exactly what an unconfigured environment sees. The value is therefore optional, unlike the required Firebase and API settings.

**Open in a new tab.** The callout shares the page with a form the user may be part-way through. Navigating away in place would discard entered credentials; `target="_blank"` with `rel="noreferrer"` keeps the sign-in tab intact.

## Risks / Trade-offs

- **A shared component grows a slot for one consumer** → mitigated by keeping the slot neutral and unnamed-for-purpose: it is an intro-panel extension point, not an "extension callout" slot, so a later admin-side addition can reuse it rather than adding a second one.
- **The landing anchor is an implicit contract** → a landing refactor that renames the element id silently degrades the deep link to a plain landing visit. The failure is soft, and the anchor is recorded in `docs/ui/pages-user.md` so a landing change has a reason to check it.
- **One more environment value to set per deployment** → mitigated by making it optional: an unset value costs a hidden callout, not a broken build, unlike the required `VITE_*` settings that fail fast.
- **The callout could drift into looking like a sign-in action** → it lives in the opposite panel from the form, and the specs pin it as staying outside the sign-in form, so a future restyle cannot quietly promote it.

## Migration Plan

Additive and reversible. No data, contract, or route changes, and the shared-component change is a new optional slot, so `apps/admin-web` needs no update. Deploying without setting `VITE_LANDING_URL` yields today's login page exactly; setting it turns the callout on. Rollback is unsetting the value or reverting the view change.

## Open Questions

- Should the callout also appear on the register screen once its design is approved? The current `.pen` screens place it on login only, so this change follows the design and leaves register untouched.

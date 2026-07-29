## Context

The login view renders a hero panel and a sign-in stack: email/password, `Sign in`, `Continue with Google`, the environment-gated `Continue with GitHub`, and a secondary `Create workspace`. The redesigned `Login Page` `.pen` screen adds one more element below that stack — a callout card with a puzzle icon, the title `Browser extension`, the line `Track time right from your browser`, and a forward arrow.

Constraints that shape the approach:

- `apps/user-web/AGENTS.md` and `docs/ui/pages-user.md` govern the login page's structure; `GITiempo.pen` is the visual source of truth.
- The extension is not published to the Chrome Web Store — `apps/chrome-ext/README.md` documents load-unpacked installation — so there is no store URL to link to.
- `apps/landing-web` already describes the extension in its product section and ships as a separate Cloudflare Workers deployment with its own origin.
- `apps/user-web` has no landing URL today; its only cross-app destination is `VITE_ADMIN_APP_URL`.

## Goals / Non-Goals

**Goals:**

- Tell a signing-in user that the browser extension exists, at the moment they are already in a browser.
- Send them somewhere that explains it, without derailing an in-progress sign-in.
- Degrade to nothing in environments where the destination is unknown.
- Bring `docs/ui/pages-user.md` back in line with the redesigned auth screens.

**Non-Goals:**

- No extension install flow, detection of an already-installed extension, or store submission.
- No callout on the admin login, register, or invite screens; the approved design places it on the user login only.
- No new landing page section or landing code change.
- No API, contract, or database work.

## Decisions

**Link to the landing rather than the Chrome Web Store.** The store listing does not exist yet, and shipping a dead or placeholder link on the login page is worse than shipping nothing. The landing already carries the extension narrative and is the page the product markets. When the extension is published, the landing section can gain a store button and the login callout keeps working unchanged. *Alternative considered:* a store URL behind a feature flag — rejected because it adds a flag whose only state today is "off", and the landing link is useful in both worlds.

**Target the existing extension content anchor on the landing.** The landing's product section already contains the extension copy under a stable element id, so the callout can deep-link to it with no landing change. *Alternative considered:* adding a dedicated `#extension` section anchor — deferred, because it would couple this change to `add-public-landing-page`, which is still in flight. If a dedicated section later appears, only the anchor constant moves.

**Configure the destination as `VITE_LANDING_URL`, mirroring `VITE_ADMIN_APP_URL`.** Cross-app destinations in this SPA are already build-time `VITE_*` origins rather than hardcoded hosts, because each app deploys to its own Cloudflare origin per environment. Reusing that shape keeps the deployment tables uniform.

**Render nothing when the value is absent, rather than falling back to a default host.** A wrong-origin link on the login page is a support problem; an absent callout is invisible. This also keeps local development honest — a developer who has not set the value sees exactly what an unconfigured environment sees. The value is therefore optional, unlike the required Firebase and API settings.

**Open in a new tab.** The callout sits inside a form the user is in the middle of filling. Navigating away in place would discard entered credentials; `target="_blank"` with `rel="noreferrer"` keeps the sign-in tab intact.

## Risks / Trade-offs

- **The landing anchor is an implicit contract** → a landing refactor that renames the element id silently degrades the deep link to a plain landing visit. The link still resolves to a useful page, so the failure is soft; the anchor is recorded in `docs/ui/pages-user.md` so a landing change has a reason to check it.
- **One more environment value to set per deployment** → mitigated by making it optional: an unset value costs a hidden callout, not a broken build, unlike the required `VITE_*` settings that fail fast.
- **The callout competes for attention with the sign-in actions** → mitigated by placing it below the whole action stack and styling it as a secondary surface, per the approved screen; the specs pin it as "not an additional sign-in action" so a future restyle cannot quietly promote it.

## Migration Plan

Additive and reversible. No data, contract, or route changes. Deploying without setting `VITE_LANDING_URL` yields today's login page exactly; setting it turns the callout on. Rollback is unsetting the value or reverting the view change.

## Open Questions

- Should the callout also appear on the register screen once its design is approved? The current `.pen` screens place it on login only, so this change follows the design and leaves register untouched.

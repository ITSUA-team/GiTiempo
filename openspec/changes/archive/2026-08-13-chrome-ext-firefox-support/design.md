## Context

The extension was written for Chrome and carries three Chromium assumptions: a background service worker, an `oauth2` manifest key holding the Google client id, and a single redirect destination configured on the backend for GitHub sign-in.

Firefox breaks all three. It has never supported `background.service_worker`. It ignores `oauth2`, so the client id read from it would be absent. And its extension redirect host is derived by the browser from the add-on id — it is not the Chrome host and cannot be computed server side, so the one configured destination points at a host Firefox will never intercept.

Constraints that shaped the design:

- The backend resolves the GitHub destination from configuration and never from the request. The handoff code rides in that URL, so a caller-supplied destination would let anyone reaching `/start` have a code delivered to a host they control (RFC 9700 §4.1). Any Firefox support must preserve that.
- `'extension'` as a login target is load-bearing in seven places in the sign-in service — challenge handling, cookie binding, redirect sanitisation.
- The extension's background bundle imports a shared chunk, so it is an ES module in both browsers.

## Goals / Non-Goals

**Goals:**

- One source tree, one command, two installable artifacts.
- The Chrome build keeps working and stays covered by its existing checks.
- Google and GitHub sign-in both complete in Firefox.
- Nothing about the port weakens where a handoff code may be delivered.

**Non-Goals:**

- Safari, Edge, or any third target. The build now has a target axis, so adding one later is a manifest entry rather than a redesign.
- Publishing to addons.mozilla.org. The manifest carries what AMO requires, but submission is out of scope.
- Reworking how identities are linked across sign-in providers.

## Decisions

### Two builds rather than one shared manifest

A single manifest can carry both background keys: Chrome ignores `scripts`, Firefox ignores `service_worker`. That was the first implementation and it was wrong.

Firefox refuses to start a background page at all while `service_worker` is present, until version 121. Emitting a Firefox manifest without that key drops the floor to 112, where ES module event pages already worked — nine releases of users, given up for nothing. Each store's linter also sees only keys its own browser understands.

### A plugin rather than a hand-rolled split

`vite-plugin-web-extension` writes the manifest once with `{{chrome}}.` / `{{firefox}}.` prefixes and emits the matching subset per target. Splitting by hand was attempted first and rejected: it is a solved problem, and the hand-rolled version would have needed maintaining.

The trade is that the plugin owns the build. It derives entry points from the manifest, so the manifest lists source paths and the separate content-script config is gone.

The plugin declares `vite` as a dependency rather than a peer, so installing it produced two copies whose `Plugin` types are different identities and fail to typecheck. A pnpm override collapses them; the tree ends up cleaner than before, since the repo already carried two vite versions.

### The Google client id moves out of the manifest

`manifest.oauth2` is Chromium-only. The runtime already held the same id in `extensionConfig` and read the manifest only to cross-check it, so the fix deletes the manifest read rather than adding a per-browser branch. The two tests asserting on that cross-check became meaningless and were replaced by one covering the `identity` permission and one covering that the id comes from configuration.

### The browser discriminator is orthogonal to the login target

Adding `'extension-firefox'` as a fourth `app` value would have required auditing seven branches that ask "is this the extension?", where a single missed one is an authentication defect rather than a broken page. A separate `browser` parameter touches only `redirectBase`.

It names one of the operator's configured destinations and never supplies a URL, so the exact-match guarantee holds unchanged. It rides in the signed state so the callback resolves the destination the start chose, and it is omitted when `chrome`, which keeps states signed before this change valid.

### `gecko.id` is configuration; `strict_min_version` is not

The add-on id decides the extension's identity and both redirect URIs, exactly as `VITE_EXTENSION_KEY` does for Chrome, so it is per-environment and required. A default would let a forgotten variable produce a build that compiles, installs, runs, and fails only at sign-in.

`strict_min_version` stays in code because there is nothing to choose: 112 is the Firefox that shipped `background.type: "module"`, which this bundle needs. A lower value cannot make an older Firefox load it; a higher one only excludes users.

## Risks / Trade-offs

- **Two redirect URIs per sign-in provider now need registering** → Documented in the README with the exact console command that prints them. They are stable as long as `gecko.id` is, which is why that id must never move once anything is registered against it.
- **The Google OAuth client must be of type "Web application"** → The "Chrome Extension" type accepts no custom redirect URIs, so it cannot hold the Firefox one. One Web application client can hold both.
- **A temporarily installed add-on has no host permissions** → Firefox grants them at install, and `about:debugging` performs no install. Every API call is blocked by CORS until they are enabled by hand. This reads exactly like a code defect and is not one; the README says so.
- **Deploying the API without the Firefox destination** → Surfaces as a 503 before the browser leaves for GitHub. Deliberate: better than a failure discovered after the user has authorized.
- **Building the extension without `VITE_EXTENSION_GECKO_ID`** → The build fails. Deliberate, but it is a step for whoever configures CI.
- **The plugin's nested vite** → Pinned by an override today. If a future vite bump outpaces the plugin, the override becomes the thing that blocks it.

## Migration Plan

No data migration. Two configuration values must exist before the code that needs them runs:

1. Read both Firefox redirect URIs from the loaded add-on — `getRedirectURL()` for GitHub, `getRedirectURL("oauth2")` for Google.
2. Register the Google one on the OAuth client; set the GitHub one as `SIGNIN_GITHUB_EXTENSION_FIREFOX_REDIRECT_URL`.
3. Set `VITE_EXTENSION_GECKO_ID` wherever the extension is built.
4. Deploy.

Rolling back is reverting the commits. The Chrome path is unchanged throughout: its manifest, its redirect, and its configuration key are all untouched.

## Open Questions

- Should the Firefox build be signed and published to addons.mozilla.org, or distributed as an unsigned artifact? The manifest already carries the data-collection declaration AMO requires either way.
- Should `data_collection_permissions` also declare `authenticationInfo`? It currently declares `websiteActivity` only, on the reading that tokens stored locally are not collection. Worth confirming before an AMO submission rather than after a rejection.

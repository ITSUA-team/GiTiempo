# Firefox support for the browser extension

## Why

The extension is Chrome-only. Its manifest declares a background service worker, which Firefox does not support at all, and its Google client id is read from `manifest.oauth2`, a Chromium-only key that Firefox would find empty. Members who work in Firefox cannot track time from GitHub without switching browsers (#378).

The GitHub sign-in path fails for a second, less obvious reason. The backend resolves the extension's redirect destination from its own configuration — deliberately, because the handoff code rides in that URL — and it holds exactly one, Chrome's. Firefox's redirect host is derived by the browser from the extension id and cannot be computed server side, so one configured value cannot serve both browsers.

## What Changes

- The extension build emits two artifacts, `dist/chrome` and `dist/firefox`, from one source tree. Each manifest carries only the keys its browser understands.
- Firefox gets a background event page (`background.scripts`); Chrome keeps its service worker. Neither manifest carries the other's key.
- The Firefox manifest declares `browser_specific_settings.gecko` with a stable add-on id, a minimum version, and the data-collection declaration addons.mozilla.org has required since 3 November 2025.
- The Google client id is read from the extension's own configuration. `manifest.oauth2` is removed rather than duplicated, because nothing reads it any more.
- The backend accepts a browser discriminator on the GitHub sign-in start endpoint and resolves the extension destination per browser. It still never takes a destination from the request.
- **BREAKING for deployment**: two new configuration values are required. `GITHUB_SIGNIN_EXTENSION_FIREFOX_REDIRECT_URL` on the API, and `VITE_EXTENSION_GECKO_ID` wherever the extension is built. Missing either fails loudly rather than silently.

## Capabilities

### New Capabilities

None. Both surfaces already have capabilities; this widens them to a second browser.

### Modified Capabilities

- `chrome-extension`: the build produces one installable bundle; it must now produce one per supported browser. Google sign-in must stop depending on a Chromium-only manifest key, and GitHub sign-in must tell the backend which browser it is.
- `github-signin`: the extension destination is a single configured value; it becomes one per browser, selected by a discriminator that names a configured destination rather than supplying one.

## Impact

- `apps/chrome-ext/vite.config.ts` — manifest is written once with browser-prefixed keys and emitted per target by `vite-plugin-web-extension`; the separate content-script config is gone, since entry points are now derived from the manifest.
- `apps/chrome-ext/src/lib/firebase.ts` — the Google client id comes from configuration.
- `apps/chrome-ext/src/lib/config.ts`, `github-signin.ts` — the build target is baked in and sent on the sign-in start URL.
- `apps/api/src/auth/services/auth-github.service.ts`, its controller, and `env.validation.ts` — per-browser destination.
- `.github/workflows/deploy-api.yml`, both `.env.example` files, `apps/chrome-ext/README.md`.
- New dependency: `vite-plugin-web-extension`. A pnpm override pins vite to a single version, because the plugin declares vite as a dependency rather than a peer and the install otherwise produced two copies.

No database migration and no shared contract change.

## Current state

Implemented on `feat/chrome-ext-firefox-support` (PR #388). Both builds are produced and their manifests verified; api and extension typecheck, lint and unit suites pass.

Not verified: Firefox itself. Loading the add-on and exercising the popup, content scripts, timer actions, session persistence and both sign-in paths needs a browser, as does reading the Firefox redirect URIs to register them.

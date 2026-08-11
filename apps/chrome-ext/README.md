# GiTiempo Browser Extension

Manifest V3 extension for starting and stopping GiTiempo timers from GitHub issue pages. One source tree, two builds: `dist/chrome` and `dist/firefox`.

## Commands

- `pnpm --filter chrome-ext build` — builds both targets
- `pnpm --filter chrome-ext build:chrome`
- `pnpm --filter chrome-ext build:firefox`
- `pnpm --filter chrome-ext typecheck`
- `pnpm --filter chrome-ext test`
- `pnpm --filter chrome-ext lint`

## Environment

Copy `.env.example` and set all extension environment values before building the extension.
Production builds fail fast when any required `VITE_EXTENSION_*` value is missing.
Google sign-in requires `VITE_EXTENSION_GOOGLE_CLIENT_ID`, which the runtime reads from the generated config. The manifest no longer carries an `oauth2` block: that key is Chromium-only, so reading the client id from it would have left Firefox with no client at all.
`VITE_EXTENSION_USER_SPA_URL` does double duty: it is the sign-in destination, and its origin is the app home the popup header opens. That assumes the User SPA is served from the root of the origin; hosting it under a subpath would mean configuring the two destinations separately.

## Load Unpacked — Chrome

1. Run `pnpm --filter chrome-ext build`.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Load unpacked from `apps/chrome-ext/dist/chrome`.

## Load Temporary — Firefox

1. Run `pnpm --filter chrome-ext build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on**.
4. Select `apps/chrome-ext/dist/firefox/manifest.json` — the manifest itself, not the folder.

A temporary add-on is removed when Firefox closes, so repeat this after each restart. Requires Firefox 112 or newer, which the manifest declares through `strict_min_version`.

## How the two builds are produced

`vite-plugin-web-extension` builds one source tree into two output folders. The manifest is written once, with browser-prefixed keys, and the plugin emits only the keys matching the target:

```json
"{{chrome}}.background":  { "service_worker": "src/background/main.ts", "type": "module" },
"{{firefox}}.background": { "scripts": ["src/background/main.ts"], "type": "module" }
```

`EXT_TARGET` selects the target and the output folder — `dist/chrome` or `dist/firefox`. Each manifest carries only what its browser understands, so neither store's linter sees keys meant for the other.

That separation is what keeps `strict_min_version` at 112. A shared manifest would have to carry `service_worker` for Chrome, and Firefox refuses to start a background page alongside that key before version 121 — even though ES module event pages have worked since 112.

The plugin also discovers entry points from the manifest, which is why it lists source paths rather than build output. There is no separate content-script build config any more.

`browser_specific_settings.gecko.id` is not cosmetic. Firefox derives the `identity.getRedirectURL()` value from the extension id, and without a fixed id that redirect changes on every temporary install, so no Google OAuth client could ever match it.

## Google sign-in redirect URIs

Each browser has its own redirect URI, and both must be registered on the Google OAuth client:

- Chrome: `https://<extension-id>.chromiumapp.org/oauth2`
- Firefox: derived from the gecko id, on `extensions.allizom.org`

Firefox's value cannot be predicted from the id by hand. Load the extension, open the background console from `about:debugging`, and read it:

```js
browser.identity.getRedirectURL("oauth2");
```

Register whatever that prints. It stays stable as long as `gecko.id` does — which is why that id must never change once an OAuth client is registered against it.

## Data collection

`browser_specific_settings.gecko.data_collection_permissions` declares `websiteActivity`, required for addons.mozilla.org submissions since 3 November 2025. The extension sends the repository and issue number of the page being viewed to the GiTiempo API, which is website activity leaving the device; declaring `none` would have been untrue.

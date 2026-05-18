# GiTiempo Chrome Extension

Manifest V3 extension for starting and stopping GiTiempo timers from GitHub issue pages.

## Commands

- `pnpm --filter chrome-ext build`
- `pnpm --filter chrome-ext typecheck`
- `pnpm --filter chrome-ext test`
- `pnpm --filter chrome-ext lint`

## Environment

Copy `.env.example` and set all extension environment values before building the extension.
Production builds fail fast when any required `VITE_EXTENSION_*` value is missing.
Google sign-in requires `VITE_EXTENSION_GOOGLE_CLIENT_ID` so both the runtime config and generated manifest stay aligned for `chrome.identity.launchWebAuthFlow`.

## Load Unpacked

1. Run `pnpm --filter chrome-ext build`.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Load unpacked from `apps/chrome-ext/dist`.

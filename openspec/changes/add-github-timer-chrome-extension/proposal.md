## Why

GiTiempo has approved product, UI, and backend support for tracking time from GitHub issues, but the Chrome extension app itself is still only a placeholder. Adding the extension completes the documented MVP workflow where users start and stop timers directly from GitHub issue pages without requiring a connected GitHub account.

## What Changes

- Add a Manifest V3 Chrome extension app under `apps/chrome-ext`.
- Add a lightweight Tailwind-only popup with unauthenticated, authenticated/no-timer, running-timer, and error/disconnected states matching the approved `.pen` design and `docs/ui/chrome-ext.md`.
- Add a content script for `github.com/<owner>/<repo>/issues/<number>` pages that detects issue metadata and injects a page-local GiTiempo timer control near the GitHub issue header/actions.
- Add extension auth/session handling that signs in via Firebase, exchanges credentials through the existing auth flow, stores JWT tokens in `chrome.storage`, and attaches the access token to API requests.
- Add extension timer API integration using existing endpoints for current timer lookup, GitHub issue timer start, and timer stop.
- Add focused tests/build verification for URL parsing, issue metadata extraction, API payloads, token storage, popup state rendering, and injected control state behavior.

## Capabilities

### New Capabilities
- `chrome-extension`: Chrome extension popup and GitHub issue-page injected timer behavior.

### Modified Capabilities
- `frontend-shared-leaves`: Reuse shared token styling/runtime leaves from extension code without introducing SPA-only dependencies.

## Impact

- New workspace app: `apps/chrome-ext` with Manifest V3 build, popup, content script, background/auth runtime, tests, and package scripts.
- Shared frontend/theme usage: extension imports shared Tailwind token CSS from `packages/web-config` but does not load PrimeVue.
- API consumption: existing `GET /time-entries/current`, `POST /time-entries/timer/start-from-github`, and `POST /time-entries/timer/stop` endpoints are consumed; no backend contract change is expected.
- Auth/session: extension stores JWT tokens in `chrome.storage` and reuses the existing Firebase-to-backend login direction.
- Verification: extension lint/typecheck/test/build plus existing shared package checks when shared leaves are changed.

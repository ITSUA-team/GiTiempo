## Context

`apps/chrome-ext/` currently contains only `.gitkeep`, while root project guidance explicitly reserves it for a future browser extension. Product docs already define the Chrome extension workflow: a Manifest V3 extension detects GitHub issue pages, signs users in with Firebase, stores JWTs in `chrome.storage`, and calls existing time-entry timer endpoints. UI docs and `GITiempo.pen` define two extension surfaces: a fixed-size popup and an injected GitHub issue-page timer control.

The backend already supports the required timer behavior through existing API and shared contract surfaces. The extension should therefore be implemented as a frontend/runtime app that consumes current contracts, not as a backend/API change.

Affected areas:
- `apps/chrome-ext`: new extension app, Manifest V3 runtime, popup, content script, background/auth wiring, tests, and package scripts.
- `packages/web-config`: shared token CSS import only if the extension needs an explicit export/build path for existing tokens.
- `packages/shared`: reuse existing contract types/schemas where practical; avoid adding browser-only helpers here.
- `apps/api`: no planned code changes unless implementation uncovers a contract mismatch with the existing timer endpoints.

## Goals / Non-Goals

**Goals:**
- Scaffold a workspace-managed Manifest V3 extension app under `apps/chrome-ext`.
- Implement the popup states documented in `docs/ui/chrome-ext.md` and approved in `GITiempo.pen`: unauthenticated, authenticated/no active timer, running timer, and error/disconnected.
- Implement an injected GitHub issue-page timer control for `github.com/<owner>/<repo>/issues/<number>` with idle, auth-missing, running, and error states.
- Parse GitHub issue context from the URL and page DOM, then submit `githubRepo`, `issueNumber`, and `issueTitle` to `POST /time-entries/timer/start-from-github`.
- Support stopping the current timer through `POST /time-entries/timer/stop` and current-timer reconciliation through `GET /time-entries/current`.
- Reuse shared design tokens while keeping the extension Tailwind-only and PrimeVue-free.
- Cover timer parsing, API payloads, storage/auth boundaries, and visible popup/injected state behavior with focused tests.

**Non-Goals:**
- No new backend endpoint or data model changes.
- No requirement for a connected GitHub account for issue-page start/stop timer flow.
- No GitHub API calls from the extension for MVP timer start/stop; issue metadata comes from the page URL/DOM.
- No Chrome Web Store publish automation.
- No broad extraction of SPA auth/router/store code into the extension.
- No full GitHub repository/project browsing UI in the extension.

## Decisions

1. **Create a dedicated `apps/chrome-ext` workspace app.**
   - Decision: add an extension-specific package with its own Vite/Vitest/TypeScript setup, manifest, popup entry, content script entry, and background/service-worker entry.
   - Rationale: the extension has browser-extension APIs, content-script constraints, and build outputs that differ from the Vue SPAs.
   - Alternative considered: embed extension code in `apps/user-web`. Rejected because it would couple SPA routing/build assumptions to extension runtime constraints.

2. **Use Tailwind and shared token CSS without PrimeVue.**
   - Decision: extension UI uses Tailwind utility classes backed by existing token CSS from `packages/web-config` and raw semantic HTML controls where appropriate.
   - Rationale: docs explicitly say the extension is Tailwind-only and PrimeVue is not loaded.
   - Alternative considered: load PrimeVue for popup parity. Rejected because it increases bundle weight and conflicts with documented extension constraints.

3. **Keep extension auth/session storage behind a small extension-owned boundary.**
   - Decision: implement a narrow storage/auth module that reads/writes access and refresh tokens in `chrome.storage` and exposes typed helpers to popup/content/background code.
   - Rationale: SPA auth helpers assume web app storage/runtime, while extension storage and service-worker messaging are different boundaries.
   - Alternative considered: copy a SPA auth store. Rejected because route/app state, Pinia, and localStorage assumptions do not belong in a content-script/popup runtime.

4. **Centralize API calls in an extension-owned client that validates known contract shapes.**
   - Decision: create a small extension API client for current timer, start-from-GitHub, and stop timer requests, using existing shared Zod schemas/types where they are browser-safe.
   - Rationale: request path, auth headers, payload shape, and error parsing are high-risk integration points and need focused tests.
   - Alternative considered: issue fetch calls directly from UI components/content scripts. Rejected because it duplicates error parsing and makes state behavior harder to test.

5. **Inject a self-contained page-local control and reconcile state through extension messaging.**
   - Decision: the content script owns GitHub page detection and DOM insertion, while API calls can run through a shared extension runtime boundary so popup and injected control see consistent timer/auth state.
   - Rationale: GitHub page DOM is outside the app; a small injected root with explicit mount/unmount behavior minimizes collision with GitHub markup.
   - Alternative considered: floating overlay. Rejected because docs require placement near issue header/content actions so the control reads as page-local.

6. **Treat documented and approved UI as the parity checklist, with missing injected states implemented from docs.**
   - Decision: match `GITiempo.pen` for available desktop popup/injected states and use `docs/ui/chrome-ext.md` for injected auth-missing and error states that are not fully represented in the current `.pen` screen.
   - Rationale: repo guidance makes docs source of truth when design is incomplete or ambiguous.
   - Alternative considered: delay implementation until every state has a `.pen` frame. Rejected because docs already define behavior and the missing states are straightforward variants of the approved shell.

## Risks / Trade-offs

- **GitHub DOM selectors may change** → Keep URL parsing independent from DOM extraction, use resilient title fallbacks, and test parser behavior separately from DOM insertion.
- **Chrome extension auth flows differ from normal web auth** → Keep auth storage and Firebase login code extension-owned, with tests around storage transitions and missing/expired token behavior.
- **Content script and popup can show stale timer state** → Reconcile through current-timer fetch on mount and after start/stop actions; broadcast successful mutations to other extension surfaces.
- **Shared token imports may pull too much SPA styling** → Import only the shared token CSS path required for Tailwind utilities; do not import PrimeVue or SPA bootstrap CSS.
- **Stop timer endpoint is global to the current user timer** → Render the current issue context clearly and refresh authoritative current timer state after stop/start failures.
- **Missing approved `.pen` variants for some injected states** → Preserve the documented shell, hierarchy, token language, and action hierarchy; call out any remaining design gaps after implementation.

## Migration Plan

1. Add the extension workspace package and include it in existing pnpm workspace discovery through `apps/*`.
2. Build and test the extension locally using package scripts before loading unpacked build output in Chrome.
3. Deploy as an additive app; existing SPAs and API behavior remain unchanged.
4. Rollback by removing or disabling the extension package/build artifact; no database migration or backend rollback is expected.

## Open Questions

- Which exact Firebase extension sign-in method should ship first: popup-window Google sign-in only, email/password, or both?
- What production environment variables/URLs should the extension package use for API base URL, Firebase config, and User SPA link?
- Should the extension proactively refresh JWT access tokens, or initially require re-authentication when the API returns unauthorized?

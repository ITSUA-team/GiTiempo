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

4. **Support both Google and email sign-in in the extension MVP.**
   - Decision: the unauthenticated popup offers `Sign in with Google` as the primary action and `Sign in with email` as the secondary action. Both methods authenticate through Firebase before exchanging the Firebase ID token with the existing backend `/auth/login` endpoint.
   - Rationale: both sign-in methods are already part of the workspace auth model, and supporting both avoids blocking users whose workspace identity is email/password based.
   - Alternative considered: Google-only MVP. Rejected because the approved extension scope is an additive timer surface for existing workspace users, not a new auth policy.

5. **Centralize API calls in an extension-owned client that validates known contract shapes.**
   - Decision: create a small extension API client for current timer, start-from-GitHub, and stop timer requests, using existing shared Zod schemas/types where they are browser-safe.
   - Rationale: request path, auth headers, payload shape, and error parsing are high-risk integration points and need focused tests.
   - Alternative considered: issue fetch calls directly from UI components/content scripts. Rejected because it duplicates error parsing and makes state behavior harder to test.

6. **Inject a self-contained page-local control and reconcile state through extension messaging.**
   - Decision: the content script owns GitHub page detection and DOM insertion at the start of the GitHub page `main` container, while API calls can run through a shared extension runtime boundary so popup and injected control see consistent timer/auth state.
   - Rationale: GitHub page DOM is outside the app; a small injected root with explicit mount/unmount behavior minimizes collision with GitHub markup.
   - Alternative considered: placement near issue header/content actions. Rejected because a stable `main` prepend target is simpler to verify across GitHub issue layouts while still reading as page-local content.

7. **Treat documented and approved UI as the parity checklist.**
   - Decision: match `GITiempo.pen` for desktop popup and injected states, including popup unauthenticated, no-timer, running, unsupported-page, error/disconnected, and injected idle, auth-missing, running, and error variants. The injected GitHub control stays page-local and intentionally drops the standalone card shell so it reads as inline issue-page UI rather than a popup surface clone.
   - Rationale: repo guidance makes docs and approved design the source of truth for behavior and parity.
   - Alternative considered: derive missing injected states only from docs. Rejected after the approved `.pen` was updated to include those variants explicitly.

8. **Use explicit extension environment configuration.**
   - Decision: the extension config module reads `VITE_EXTENSION_API_BASE_URL`, `VITE_EXTENSION_FIREBASE_API_KEY`, `VITE_EXTENSION_FIREBASE_AUTH_DOMAIN`, `VITE_EXTENSION_FIREBASE_PROJECT_ID`, and `VITE_EXTENSION_USER_SPA_URL` from the extension build environment and validates that required values are present.
   - Rationale: the extension runs outside the SPA runtime, so API, Firebase, and workspace links must be configured at the extension package boundary.
   - Alternative considered: reuse User SPA environment names directly. Rejected because extension deployment and Chrome runtime constraints may differ from the SPA.

9. **Refresh access tokens once before returning to sign-in.**
   - Decision: the extension stores both access and refresh tokens in `chrome.storage`. When an authenticated API request returns `401`, the API/session boundary attempts one `/auth/refresh` call, retries the original request after a successful refresh, and clears the session plus returns to the unauthenticated state if refresh fails.
   - Rationale: the backend already exposes refresh-token exchange, and one retry reduces unnecessary sign-in prompts without hiding expired-session failures.
   - Alternative considered: require re-authentication on every `401`. Rejected because it creates avoidable friction for a timer surface that users may leave running for long sessions.

## Risks / Trade-offs

- **GitHub DOM selectors may change** → Keep URL parsing independent from DOM extraction, use resilient title fallbacks, and test parser behavior separately from DOM insertion.
- **Chrome extension auth flows differ from normal web auth** → Keep auth storage and Firebase login code extension-owned, with tests around storage transitions and missing/expired token behavior.
- **Content script and popup can show stale timer state** → Reconcile through current-timer fetch on mount and after start/stop actions; broadcast successful mutations to other extension surfaces.
- **Shared token imports may pull too much SPA styling** → Import only the shared token CSS path required for Tailwind utilities; do not import PrimeVue or SPA bootstrap CSS.
- **Stop timer endpoint is global to the current user timer** → Render the current issue context clearly and refresh authoritative current timer state after stop/start failures.
- **Popup and injected variants can drift over time** → Keep `docs/ui/chrome-ext.md` and `GITiempo.pen` synchronized before implementation and perform final parity review against both, especially where the injected control intentionally diverges from the popup card shell.

## Migration Plan

1. Add the extension workspace package and include it in existing pnpm workspace discovery through `apps/*`.
2. Build and test the extension locally using package scripts before loading unpacked build output in Chrome.
3. Deploy as an additive app; existing SPAs and API behavior remain unchanged.
4. Rollback by removing or disabling the extension package/build artifact; no database migration or backend rollback is expected.

## Open Questions

- None for the MVP implementation scope.

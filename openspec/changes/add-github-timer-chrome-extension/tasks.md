## 1. Extension App Scaffold

- [x] 1.1 Create `apps/chrome-ext` package manifest, TypeScript config, Vite build config, Vitest config, and app-local README/AGENTS notes for extension-specific constraints.
- [x] 1.2 Add Manifest V3 manifest generation/static asset wiring with popup, content script, and background/service-worker entries.
- [x] 1.3 Add extension CSS entry that uses shared GiTiempo token styling while avoiding PrimeVue and SPA bootstrap imports.
- [x] 1.4 Add package scripts for `build`, `typecheck`, `test`, and any extension-specific lint/check command supported by the repo setup.

## 2. Shared Extension Runtime Boundaries

- [x] 2.1 Implement extension configuration for `VITE_EXTENSION_API_BASE_URL`, `VITE_EXTENSION_FIREBASE_API_KEY`, `VITE_EXTENSION_FIREBASE_AUTH_DOMAIN`, `VITE_EXTENSION_FIREBASE_PROJECT_ID`, `VITE_EXTENSION_USER_SPA_URL`, and extension environment defaults.
- [x] 2.2 Implement `chrome.storage` session helpers for GiTiempo access/refresh tokens with focused tests.
- [x] 2.3 Implement extension auth flow that supports both Google sign-in and email sign-in through Firebase, then exchanges identity with the existing backend auth API.
- [x] 2.4 Implement extension message/event helpers so popup, content script, and background runtime can reconcile auth and timer state.
- [x] 2.5 Implement one-shot `/auth/refresh` retry behavior for authenticated API `401` responses, clearing the extension session when refresh fails.

## 3. Timer API Client And Context Parsing

- [x] 3.1 Implement a small extension API client for current timer, start-from-GitHub, and stop timer endpoints with shared contract validation where browser-safe.
- [x] 3.2 Add API client tests for request paths, auth headers, payload shape, response parsing, and error propagation.
- [x] 3.3 Implement GitHub issue URL parsing for `github.com/<owner>/<repo>/issues/<number>`.
- [x] 3.4 Implement GitHub issue title/context extraction with safe fallback and tests for supported and unsupported pages.

## 4. Popup UI

- [x] 4.1 Implement the branded fixed `320 x 480px` popup shell using Tailwind token utilities.
- [x] 4.2 Implement unauthenticated popup state with primary sign-in action.
- [x] 4.3 Implement authenticated/no-active-timer popup state with detected issue context, full-width `Start Timer`, and User SPA link.
- [x] 4.4 Implement running-timer popup state with live elapsed time, task/project or repository context, and destructive `Stop Timer` action.
- [x] 4.5 Implement popup error/disconnected state with concise copy and retry action.
- [x] 4.6 Implement authenticated unsupported-page popup state with branded shell, `Open a GitHub issue page to start a timer.` guidance, no available Start Timer action, and User SPA link.
- [x] 4.7 Add focused popup tests for Google sign-in, email sign-in, unsupported-page state, each user-visible timer state, and start/stop/retry interactions.

## 5. Injected GitHub Issue Control

- [x] 5.1 Implement content-script mounting on supported GitHub issue pages near the issue header/content actions.
- [x] 5.2 Implement injected idle state with detected repository, issue number/title, and primary `Start Timer` action.
- [x] 5.3 Implement injected auth-missing state that replaces timer start with `Open extension` or equivalent sign-in guidance.
- [x] 5.4 Implement injected running state with live `HH:MM:SS`, issue context, and destructive `Stop Timer` action.
- [x] 5.5 Implement injected error state that preserves issue context and shows concise error copy plus retry.
- [x] 5.6 Add focused content-script/injected-control tests for mount behavior, state rendering, start/stop actions, and retryable failures.

## 6. Integration And Verification

- [x] 6.1 Reconcile popup and injected control state after successful start/stop actions and after failed API actions.
- [x] 6.2 Verify no extension bundle imports PrimeVue, Vue Router, Pinia stores, or SPA bootstrap modules.
- [x] 6.3 Run extension `typecheck`, `test`, and `build` commands and fix failures.
- [x] 6.4 If `packages/web-config` or shared frontend leaves change, run the required affected shared/frontend verification commands.
- [x] 6.5 Perform a design parity review against `docs/ui/chrome-ext.md` and `GITiempo.pen`, documenting any docs-over-design or PrimeVue-free extension compromises.

Design parity review note:
- Docs and approved extension frames were reviewed together. No PrimeVue-driven compromises were required because the extension stays Tailwind-only. The popup header uses a static GiTiempo badge instead of a user-specific avatar from the `.pen` reference because the MVP docs require the branded shell and state copy, but they do not require fetching profile data for the extension popup.
- The injected GitHub issue-page control intentionally uses a lighter inline shell than the popup and no longer renders as a standalone card. Source-of-truth docs were updated to reflect that page-local presentation.

## 1. Extension App Scaffold

- [ ] 1.1 Create `apps/chrome-ext` package manifest, TypeScript config, Vite build config, Vitest config, and app-local README/AGENTS notes for extension-specific constraints.
- [ ] 1.2 Add Manifest V3 manifest generation/static asset wiring with popup, content script, and background/service-worker entries.
- [ ] 1.3 Add extension CSS entry that uses shared GiTiempo token styling while avoiding PrimeVue and SPA bootstrap imports.
- [ ] 1.4 Add package scripts for `build`, `typecheck`, `test`, and any extension-specific lint/check command supported by the repo setup.

## 2. Shared Extension Runtime Boundaries

- [ ] 2.1 Implement extension configuration for API base URL, Firebase config, User SPA URL, and extension environment defaults.
- [ ] 2.2 Implement `chrome.storage` session helpers for GiTiempo access/refresh tokens with focused tests.
- [ ] 2.3 Implement extension auth flow that signs in through Firebase and exchanges identity with the existing backend auth API.
- [ ] 2.4 Implement extension message/event helpers so popup, content script, and background runtime can reconcile auth and timer state.

## 3. Timer API Client And Context Parsing

- [ ] 3.1 Implement a small extension API client for current timer, start-from-GitHub, and stop timer endpoints with shared contract validation where browser-safe.
- [ ] 3.2 Add API client tests for request paths, auth headers, payload shape, response parsing, and error propagation.
- [ ] 3.3 Implement GitHub issue URL parsing for `github.com/<owner>/<repo>/issues/<number>`.
- [ ] 3.4 Implement GitHub issue title/context extraction with safe fallback and tests for supported and unsupported pages.

## 4. Popup UI

- [ ] 4.1 Implement the branded fixed `320 x 480px` popup shell using Tailwind token utilities.
- [ ] 4.2 Implement unauthenticated popup state with primary sign-in action.
- [ ] 4.3 Implement authenticated/no-active-timer popup state with detected issue context, full-width `Start Timer`, and User SPA link.
- [ ] 4.4 Implement running-timer popup state with live elapsed time, task/project or repository context, and destructive `Stop Timer` action.
- [ ] 4.5 Implement popup error/disconnected state with concise copy and retry action.
- [ ] 4.6 Add focused popup tests for each user-visible state and start/stop/retry interactions.

## 5. Injected GitHub Issue Control

- [ ] 5.1 Implement content-script mounting on supported GitHub issue pages near the issue header/content actions.
- [ ] 5.2 Implement injected idle state with detected repository, issue number/title, and primary `Start Timer` action.
- [ ] 5.3 Implement injected auth-missing state that replaces timer start with `Open extension` or equivalent sign-in guidance.
- [ ] 5.4 Implement injected running state with live `HH:MM:SS`, issue context, and destructive `Stop Timer` action.
- [ ] 5.5 Implement injected error state that preserves issue context and shows concise error copy plus retry.
- [ ] 5.6 Add focused content-script/injected-control tests for mount behavior, state rendering, start/stop actions, and retryable failures.

## 6. Integration And Verification

- [ ] 6.1 Reconcile popup and injected control state after successful start/stop actions and after failed API actions.
- [ ] 6.2 Verify no extension bundle imports PrimeVue, Vue Router, Pinia stores, or SPA bootstrap modules.
- [ ] 6.3 Run extension `typecheck`, `test`, and `build` commands and fix failures.
- [ ] 6.4 If `packages/web-config` or shared frontend leaves change, run the required affected shared/frontend verification commands.
- [ ] 6.5 Perform a design parity review against `docs/ui/chrome-ext.md` and `GITiempo.pen`, documenting any docs-over-design or PrimeVue-free extension compromises.

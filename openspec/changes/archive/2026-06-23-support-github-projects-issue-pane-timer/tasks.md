## 1. GitHub Issue Context Support

- [x] 1.1 Extend the shared extension GitHub context parser to recognize direct issue pages and GitHub Projects issue panes with `pane=issue` plus `issue=<owner>|<repo>|<number>`.
- [x] 1.2 Reject malformed Projects pane URLs, missing issue query values, non-issue panes, pull requests, and non-numeric issue numbers as unsupported issue context.
- [x] 1.3 Preserve the existing timer request context shape so `githubRepo`, `issueNumber`, and `issueTitle` remain the only start-from-GitHub payload fields sent to the API.
- [x] 1.4 Add parser tests for supported direct issue URLs, supported Projects issue pane URLs, and unsupported Projects/pull/malformed URLs.

## 2. Extension Runtime Matching

- [x] 2.1 Add GitHub Projects URL patterns to the Manifest V3 content-script matches in the extension build configuration.
- [x] 2.2 Add the same Projects URL coverage to background tab queries or runtime broadcast matching.
- [x] 2.3 Add or update background/build tests that assert the Projects match pattern is included without removing existing issue/pull coverage.

## 3. Injected Issue Control Placement

- [x] 3.1 Update mount-target resolution so direct issue pages still mount at the start of `main` and Projects issue panes mount immediately above `#issue-viewer-sticky-header`.
- [x] 3.2 Keep Projects pane injected spacing tighter than the direct issue-page injected control while reusing the same idle, running, auth-missing, and error states.
- [x] 3.3 Make same-URL synchronization remount when GitHub removes the injected host or replaces the surface-specific mount target.
- [x] 3.4 Make supported Projects panes wait for mutation-driven retry when `#issue-viewer-sticky-header` is not available yet, without injecting into a fallback location.
- [x] 3.5 Add content-script tests for direct issue mounting, Projects pane mounting above the sticky header, delayed sticky-header insertion, GitHub rerender remount, Projects pane issue changes, and unsupported pane unmounting.

## 4. Popup Consistency

- [x] 4.1 Reuse the updated parser so the popup detects active GitHub Projects issue panes as supported issue context.
- [x] 4.2 Update unsupported-page guidance copy to match the documented `Open a supported GitHub issue to start a timer.` wording.
- [x] 4.3 Add popup tests for Projects issue pane detection and unsupported-page guidance.

## 5. Verification

- [x] 5.1 Run `pnpm --filter chrome-ext typecheck`.
- [x] 5.2 Run `pnpm --filter chrome-ext test`.
- [x] 5.3 Run `pnpm --filter chrome-ext build`.
- [x] 5.4 Confirm no API, OpenAPI, database, shared contract, Vue SPA, PrimeVue, Vue Router, or Pinia changes were introduced.

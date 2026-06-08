## Context

The Chrome extension currently detects direct GitHub issue URLs, renders the popup issue state for those tabs, and injects `InjectedIssueApp` at the start of the direct issue page `main` container. GitHub Projects issue panes expose the same issue identity through the pane URL query string, but they are not matched by the extension content script and do not have the same mount target as direct issue pages.

Relevant source-of-truth and constraints:

- `apps/chrome-ext/AGENTS.md`: Manifest V3 only, Tailwind-only UI, extension-owned runtime orchestration, and extension verification commands.
- `docs/ui/chrome-ext.md`: Projects issue panes are supported GitHub issue surfaces, and the injected control belongs immediately above `#issue-viewer-sticky-header`.
- `GITiempo.pen`: approved Projects issue-pane frame shows the timer control above the sticky header with tighter pane spacing.
- Existing shared timer API contracts already accept the required `githubRepo`, `issueNumber`, and `issueTitle` payload.

Planned file changes are limited to `apps/chrome-ext` implementation and tests. No API app, database, OpenAPI, or shared contract changes are part of this design.

## Goals / Non-Goals

**Goals:**

- Treat GitHub Projects issue panes as supported issue surfaces when the URL contains `pane=issue` and a valid `issue=<owner>|<repo>|<number>` value.
- Keep direct issue-page behavior unchanged.
- Mount the injected issue timer above `#issue-viewer-sticky-header` on Projects panes.
- Keep Projects pane injected UI visually lighter and more compact than the direct issue-page injected control.
- Support GitHub single-page navigation and pane rerenders by remounting when the URL, page context, or mount host changes.
- Verify the extension parser, content script, popup resolution, background/content-script matches, typecheck, tests, and build.

**Non-Goals:**

- No backend endpoint or request/response contract changes.
- No database or OpenAPI changes.
- No support for GitHub Projects pages unless the issue pane identity is present in the URL.
- No support for pull-request panes, draft project items, or issue panes without a valid issue number.
- No PrimeVue, Vue Router, Pinia, or SPA bootstrap imports in the extension.

## Decisions

### Parse Projects issue panes from the URL query

The shared extension GitHub context parser will support two surface types:

- Direct issue pages: `https://github.com/<owner>/<repo>/issues/<number>`.
- Projects issue panes: `https://github.com/orgs/<org>/projects/<project>/views/<view>?pane=issue&issue=<owner>|<repo>|<number>`.

Projects pane parsing will require `pane=issue`, a valid `issue` query value split into exactly owner, repo, and numeric issue number, and a GitHub host. Malformed values remain unsupported.

Alternative considered: scrape repository and issue number from the pane DOM. This is more fragile because the URL already provides stable issue identity and the DOM structure can change during Projects pane rerenders.

### Keep timer API payload unchanged

The extension will continue sending only `githubRepo`, `issueNumber`, and `issueTitle` to `POST /time-entries/timer/start-from-github`. If the implementation adds an internal surface discriminator for mounting or spacing, it must stay extension-local and must not be sent to the strict shared contract.

Alternative considered: extend the shared contract with a GitHub surface or Projects item id. That would expand API scope without changing the backend behavior needed for timer creation.

### Use surface-specific mount targets

Direct issue pages continue to prepend the injected host to `main`. Projects issue panes insert the host immediately before `#issue-viewer-sticky-header`. If a supported Projects URL is detected before the sticky header exists, the content script should wait for mutation-driven retry instead of injecting into a fallback location.

Alternative considered: always mount at `main` for all supported URLs. That would put the control outside the issue pane and fail the approved placement.

### Make remounting resilient to GitHub navigation and rerenders

The content script should re-evaluate support when GitHub changes the URL with history navigation, when the Projects pane query changes, and when GitHub removes the injected host during DOM rerender. A same-URL check is not sufficient if the host no longer exists or the mount target changed.

Alternative considered: rely only on URL changes. GitHub Projects panes can update DOM content after the URL is already stable, so this would miss delayed mount targets.

### Match Projects pages in extension runtime configuration

The manifest and background tab queries should include GitHub Projects URL patterns in addition to existing direct issue and pull patterns. Pull pages remain matched only for existing unsupported-page cleanup behavior; timer actions still depend on the parser returning supported issue context.

Alternative considered: rely on broad host permissions alone. Host permissions allow access, but content scripts still need matching entries to run on Projects pages.

## Risks / Trade-offs

- GitHub may change Projects pane URL parameters -> Mitigate by keeping unsupported behavior explicit and covering malformed/missing query values in parser tests.
- The sticky header can appear after the first content-script pass -> Mitigate through mutation-observer retry and tests for delayed anchor insertion.
- GitHub can remove injected DOM during pane rerender -> Mitigate by checking host connectivity and remounting even when the URL has not changed.
- Compact injected styling could drift from direct issue-page states -> Mitigate by sharing state rendering and applying only surface-specific wrapper spacing.
- Popup and injected content could parse support differently -> Mitigate by using the same parser for both popup active-tab resolution and content-script context.

## Migration Plan

1. Update extension context parsing, runtime match patterns, and injected mount logic behind the existing extension entry points.
2. Add focused unit tests for Projects pane parsing, popup detection, background match patterns, content mounting, delayed anchors, remount after host removal, and unsupported malformed panes.
3. Run `pnpm --filter chrome-ext typecheck`, `pnpm --filter chrome-ext test`, and `pnpm --filter chrome-ext build`.
4. Rollback is reverting the extension-only changes; backend data and contracts are unaffected.

## Open Questions

- None.

## Why

Users triage and update GitHub issues from GitHub Projects issue panes, not only from direct issue pages. The Chrome extension timer should be available in that pane so users can start tracking from the same issue context without navigating away.

## What Changes

- Extend supported GitHub issue surfaces to include GitHub Projects issue panes with `pane=issue` and an `issue=<owner>|<repo>|<number>` query value.
- Derive the same timer request context from Projects issue panes as direct issue pages: `githubRepo`, `issueNumber`, and `issueTitle`.
- Inject the issue timer control immediately above `#issue-viewer-sticky-header` on Projects issue panes while preserving the current direct issue-page insertion at the start of `main`.
- Add tighter Projects pane spacing for the injected control so it reads as part of the pane stack.
- Update extension content-script matching and page-change handling so GitHub Projects pane navigation and rerenders mount, remount, or unmount the control correctly.
- Keep existing backend timer APIs and shared request/response contracts unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chrome-extension`: expands supported GitHub issue context detection and injected issue-control placement from direct issue pages to include GitHub Projects issue panes.

## Impact

- Affected app: `apps/chrome-ext`.
- Affected source-of-truth: `openspec/specs/chrome-extension/spec.md` through this change's delta spec.
- Affected UI docs and design: existing Chrome extension UI docs and approved `.pen` screen already define the Projects pane placement above `#issue-viewer-sticky-header`.
- API/contracts: no backend endpoint, OpenAPI, or shared contract changes are expected; the extension continues to call `POST /time-entries/timer/start-from-github` with the existing GitHub timer payload.

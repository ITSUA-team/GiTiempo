## 1. GitHub Browsing Client Boundary

- [ ] 1.1 Add or extend the user-web GitHub browsing client for `GET /github/owners` and `GET /github/repos/:owner/:repo/issues` using existing authenticated API transport and shared response schemas.
- [ ] 1.2 Add query-key helpers for GitHub browsing data scoped by authenticated user/workspace state.
- [ ] 1.3 Add focused client tests for request paths, query parameters, response parsing, and API error propagation.

## 2. Top-Bar Timer Suggestion State

- [ ] 2.1 Extend top-bar timer picker state to track GitHub issue proposals, proposal cache entries, loading state, and proposal-specific error state separately from local task loading.
- [ ] 2.2 Add proposal id helpers so GitHub issue suggestions cannot collide with local task ids or the existing `New task` option id.
- [ ] 2.3 Filter out GitHub issue suggestions when a matching local linked task already exists for the same repository and issue number.

## 3. Workspace Policy Guarding

- [ ] 3.1 Resolve GitHub repository context only for selected visible GitHub-backed projects with a valid `owner/repo` key.
- [ ] 3.2 Before repository issue fetching, load browseable GitHub owners with `type=all` and skip repository issue requests when the owner is absent.
- [ ] 3.3 Ensure the owner preflight is fresh enough to avoid stale allow-list cache causing disallowed organization issue requests.
- [ ] 3.4 Keep disallowed or invalid repository contexts non-blocking by clearing proposals without clearing local project or task options.

## 4. User-Web Picker UI Integration

- [ ] 4.1 Render GitHub issue suggestions in the top-bar timer task picker after local tasks and before the `New task` option.
- [ ] 4.2 Style suggestion rows distinctly enough to show GitHub issue provenance while preserving PrimeVue AutoComplete behavior and accessibility.
- [ ] 4.3 Selecting a suggestion MUST prefill the local new-task title from the issue title and reuse the existing local task creation flow.
- [ ] 4.4 Ensure issue suggestion loading and failures do not block selecting existing local tasks, creating a local task, starting an idle timer, or changing a running timer task.

## 5. Tests And Verification

- [ ] 5.1 Add composable tests for successful issue suggestions, suggestion selection seeding local task creation, existing linked-task filtering, proposal failure behavior, and disallowed owner behavior.
- [ ] 5.2 Add component tests for suggestion row rendering and timer component prop wiring.
- [ ] 5.3 Run focused user-web tests for the GitHub browsing client, timer composables, and timer picker components.
- [ ] 5.4 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `git diff --check`.
- [ ] 5.5 Manually confirm that an empty workspace GitHub organization allow-list does not trigger `/github/repos/:owner/:repo/issues` for an organization-owned project and that admin-web Settings remains the recovery path for blocked GitHub App access.

# Implementation and release verification

Date: 2026-09-25. Branch: `spec/420-workspace-github-installations`.

## Completed checks

| Surface | Evidence |
| --- | --- |
| Shared contracts | Build passed; 24 test files / 300 tests passed. Strict start/setup/completion/path schemas reject forged authority and credential fields. |
| API | Lint and typecheck passed; 39 unit-test files / 445 tests passed. |
| Real PostgreSQL | PostgreSQL 17.11 temporary cluster, dedicated port/database, migration 0019 and seed applied only there. Full API e2e: 19 files / 247 tests passed. Final installation/timer subset: 2 files / 50 tests passed. |
| Admin web | Typecheck passed; 66 files / 523 tests passed; lint passed with 2 existing warnings in the unrelated sign-in callback view. |
| User web | Typecheck passed; 50 files / 516 tests passed; lint passed with 12 existing warnings. |
| Extension | Typecheck passed; 11 files / 149 tests passed; Chrome and Firefox builds passed. |
| Client builds | Admin, user web, Chrome and Firefox builds passed. Existing large-chunk warnings remain. |
| OpenAPI | Regenerated using the build-based export. Verified all six installation route patterns, nine stable tracking codes, UUID management parameters and credential-free installation response schemas. |
| OpenSpec | Strict validation passed; all 43 implementation tasks completed. |
| Diff and secret boundary | `git diff --check` passed. Built browser bundles contain none of the App private-key/webhook-secret configuration names, PEM markers or installation credential fixtures searched. Provider logs contain status/operation metadata, never token responses or authorization headers. |

One initial full e2e run hit an unrelated `socket hang up` in `projects-tasks.e2e-spec.ts`; its isolated rerun passed 38/38 and the subsequent full run passed 247/247.

## Issue #420 acceptance evidence

- A workspace admin who is an active GitHub organization owner can establish a verified installation. Real-DB tests exercise setup state consumption and preservation of the previous link on wrong App, organization, owner authority, installation visibility or permissions.
- Expired/replayed/wrong-user state and admin-role loss during provider lookup cannot establish a link. Setup and reverify check current local authority at the write boundary.
- An explicitly assigned ordinary member starts a private repository issue without any personal GitHub connection. The real installation service is used; only GitHub HTTP/credential transport is mocked.
- Unassigned ordinary members are denied on public and private projects with the exact approved assignment message. Denial creates no tasks, timers or assignments.
- Existing issue ownership wins over repository mapping, which wins over verified board mapping. Coverage includes direct board-only lookup, pagination, forged hints, missing/ambiguous mapping, case-insensitive reuse and workspace isolation.
- Timer requests never create projects or assignments. Existing task status, project/task billing defaults, source, canonical metadata and one-running-timer constraints are preserved.
- Real transactions reject an assignment revocation or installation disconnect committed during GitHub lookup and roll back partial materialization. Simultaneous starts yield one running timer and one canonical task.
- Raw-body webhook signatures, invalid/non-ASCII signatures, duplicate deliveries, suspension/deletion/permission events, stale suspension reconciliation, repository authorization-version invalidation and disconnected-link non-reactivation are covered.
- Owned timer stop succeeds after installation suspension or a provider failure and retains conditional expected-timer protection.
- Popup and injected controls preserve stable domain codes, exact assignment copy, issue context and authoritative stop. Admin callback tests use GitHub's actual `state` query parameter.

## Deployment boundary and known limitations

The GitHub provider is mocked in automated verification; no production installation was created or modified, and no production database migration was executed. Release operators must configure the App private key, webhook secret, fixed `${ADMIN_SPA_URL}/settings` Setup URL, public webhook URL and approved permissions, then verify a real organization-owner installation and an assigned member tracking a real private issue. See `docs/github-installations.md`.

The extension's observed Project pane URL exposes a human project number, not a ProjectV2 node ID. It sends no fabricated board hint. Existing canonical mappings still resolve identically across surfaces; an unmapped issue belonging to multiple mapped boards receives the explicit ambiguity error until its canonical project is established. A caller that has a real ProjectV2 ID can supply the verified optional hint.

Approved UI parity sources and state checklists are recorded in `../admin-parity.md` and `extension-parity.md`. No live GitHub browser session or production credential was used as release proof.

## Historical follow-up: unified GitHub Workspace Access (superseded below)

The separate installations card was removed. The existing access card now renders one row per organization across policy and saved associations, with access status and applicable Connect access, Check access, Disconnect access, and Remove actions. Associations retained after policy removal are visibly disabled for tracking and remain locally disconnectable. Existing App installations are discovered through App authentication and completed through the same one-time-state authority checks before any redirect is considered.

Follow-up validation: admin/API/shared typecheck and lint passed (two pre-existing formatting warnings in `GithubCallbackView.vue`); admin production build and API OpenAPI export passed; the optional `existingInstallationId` appears in the generated response schema; strict OpenSpec validation and `git diff --check` passed. The build retains the existing large-chunk warning. OpenSpec telemetry could not reach its host, but validation exited successfully.

No test cases were added and no test suites or live browser checks were run for this follow-up. Existing component assertions and transport fixtures were adapted to the consolidated UI and discovery call. The earlier test totals above belong to the previous implementation and do not establish runtime coverage of this follow-up. The approved design was inspected from `GITiempo.pen`; runtime visual parity and a real GitHub setup remain unverified.


## Current follow-up: restore original UI and confirm existing Apps automatically

The user requested removal of the UI changes. `SettingsGitHubWorkspaceAccessCard.vue` is byte-for-byte identical to its pre-change HEAD version, and the `SettingsView.vue` template also matches HEAD. The separate installations card, merged status/actions, and association-only rows are absent. Existing policy controls and recovery guidance remain in place; no PrimeVue constraint forced a design deviation.

A focused Settings composable now considers allowed organizations when the list loads or changes after adding an organization. It waits for a successful current installation-list fetch and a connected administrator, attempts each missing association once per visit, discovers an existing App, and completes the existing full authority checks. It never redirects on missing installation, never automatically retries saved states (including disconnected links), and checks current scope, membership in the loaded policy list, and disposal before completing background work. Failed attempts use existing toast feedback and can be retried on a later Settings visit. Callback completion is retained.

Validation: the final admin production build (including vue-tsc) passed; admin lint passed with the two pre-existing GithubCallbackView formatting warnings, and targeted lint on changed implementation files passed without warnings. Strict OpenSpec validation and `git diff --check` passed. The existing large-bundle warning remains. Obsolete installation-management component coverage was removed with its UI; existing composable assertions were adjusted for the removed manual actions. No test cases were added and no tests or live-browser flows were run for this follow-up. Earlier test totals do not validate the new automatic flow.

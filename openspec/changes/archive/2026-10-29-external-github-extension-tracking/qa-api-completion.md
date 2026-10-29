# API completion QA — external GitHub tracking

Date: 2026-10-13

## Environment

- Isolated PostgreSQL clusters on local ports `55472` and `55473`, each using
  database `gitiempo_qa_completion`; each was initialized solely for its run.
- Applied all Drizzle migrations through `0022_external_reference_project_policy`
  and ran the normal seed before testing.
- The development database and its user, workspace, GitHub-link and time-entry
  records were not modified.
- Imports use controlled `GithubService` responses. These are deterministic
  provider fixtures, not a claim that a live GitHub App can import the same
  resource.

## New regression coverage

`apps/api/test/external-github-tracking-completion.e2e-spec.ts` adds five
isolated HTTP/DB acceptance cases:

1. An external reference start succeeds while both `GithubService` and
   `GithubInstallationsService` spies have zero calls. A later repository import
   receives `already-imported` and preserves the one project, external mode,
   user-supplied provenance, null synchronization times, task history and no
   assignment.
2. An inactive external-reference project with a GitHub Project mapping rejects
   a controlled board import. The mapping stays inactive and external; import
   creates no replacement project.
3. A repository import is deliberately paused after deterministic provider
   verification and before its database write. An overlapping external start
   wins the mapping; after the import resumes it reports `already-imported`.
   The workspace has exactly one external-reference project and the managed
   installation path remains unused.
4. A managed start pauses after its provider verification. Removing the
   ordinary member's project assignment before that request reaches its write
   transaction returns `project_assignment_required` (`403`) and creates no
   task or time entry.
5. The same pause followed by membership removal returns `401` and creates no
   task or time entry. This exercises the transactional membership lock rather
   than only a service mock.

`test/project-imports.e2e-spec.ts` was updated because migration `0022` makes
two differently cased repository mappings in one workspace impossible. The
test now proves PostgreSQL rejects the second holder through
`project_external_refs_workspace_provider_repository_key_ci_uniq`, then proves
the canonical holder resolves normally. This replaces an obsolete fixture that
required duplicate identity rows.

## Results

| Area | Evidence | Result |
| --- | --- | --- |
| 9.7 managed/external boundary | External route makes zero provider or installation calls; existing managed mapping delegates to installation path in `external-github-tracking.e2e-spec.ts` | Pass with controlled services |
| 9.8 link/installation lifecycle | Existing `github-disconnect-tracking-http.e2e-spec.ts` runs in the complete suite; it proves personal disconnect does not change installation-backed tracking. External starts are independently link-free. | Pass for deterministic lifecycle states |
| 9.10 external mode and import safety | Repository reuse, inactive board refusal, provenance/history/assignment preservation | Pass |
| 9.18 repository and board import collision | Controlled import fixtures plus one live isolated DB transaction; inactive external board cannot be reassigned | Pass for deterministic provider fixture |
| 9.20 reference/import and access overlap | Controlled import/reference interleaving leaves one external mapping. Controlled provider pauses followed by actual assignment or membership deletion deny the write with no partial task/entry records. | Pass |
| outbound-call audit | `GithubService.getRepository`, `GithubService.resolveImportableProject`, and `GithubInstallationsService.prepareIssue` are all asserted uncalled for an external reference start | Pass |
| restored managed provider path | `test/manual-real-github-provider-qa.ts` copied only the non-secret restored ITSUA-team installation identity into a disposable workspace. The unmocked GitHub App read `ITSUA-team/GiTiempo#439`; managed start returned `201` and stop returned `200`. | Pass, live read-only GitHub App check |

## Commands and fresh evidence

```text
DATABASE_URL=postgresql://localhost:55473/gitiempo_qa_completion \
  pnpm --filter @gitiempo/api db:migrate

DATABASE_URL=postgresql://localhost:55473/gitiempo_qa_completion \
  pnpm --filter @gitiempo/api db:seed

NODE_ENV=test DATABASE_URL=postgresql://localhost:55473/gitiempo_qa_completion \
  ./node_modules/.bin/vitest run --config ./vitest.e2e.config.ts

NODE_ENV=test INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS=false \
  DATABASE_URL=postgresql://localhost:55473/gitiempo_qa_completion \
  node --env-file=.env -r ts-node/register -r tsconfig-paths/register \
  test/manual-real-github-provider-qa.ts
```

The first full run after the initial fixture correction passed: **29 test
files, 304 tests**. The focused expanded suite passed **5 tests**. The fresh
full run after the two access-boundary additions passed: **29 test files, 306
tests**. `pnpm exec eslint --fix test/external-github-tracking-completion.e2e-spec.ts`, targeted ESLint, and `pnpm run typecheck` also passed.

## Live provider check

After the test ITSUA-team installation was restored, its local association was
verified before this check. The script used the configured App credentials and
an isolated database only; it copied no secrets and made no change to the real
workspace, organization, App installation, repository, issue, or project.
Its QA workspace, user, association, project, task, and time entry are deleted
in `finally`, including failure paths. The script uses `ts-node` rather than
`tsx` because Nest requires emitted decorator metadata for this standalone
application context.

## Live import browse limitation

An initial disposable probe confirmed that account-link OAuth credentials do
not authorize repository or board browsing: `GET /github/repos` returned `404
GitHub connection not found` before a GitHub request. This is the intended
credential separation, not a routing defect. `github_account_links` and
`github_oauth_grants` hold account identity and organization-discovery OAuth;
`GithubConnectionsService` and `github_connections` hold the separate personal
GitHub App authorization used for repository, issue, and Project browsing and
imports. The local account has the former but no personal-App row. The remaining
live browse/import prerequisite is a Profile personal-data authorization via
`GET /github/auth-url` and its callback for the permitted test administrator.
No token was printed or decrypted, and the probe database and server were
removed.

## Follow-up after Profile authorization report

After the test administrator reported completing Profile → **Authorize GitHub
data**, the local development database was checked read-only. The two local
SPAs both target `http://localhost:3000`, and that API's configured callback
origin is also `http://localhost:3000`, so this check covered the configured
local path rather than a guessed environment.

The email currently has three local test identities. One has the expected
GitHub account link and OAuth discovery grant, but none has a
`github_connections` row, encrypted personal-data token presence, or a recent
`github_app` / `personal_data` authorization-state record. The most recent
authorization-state activity is `oauth_app` / `account_link`, which is the
separate **Reconnect GitHub** flow.

The Profile implementation confirms the distinction: **Reconnect** calls
`GET /github/account/auth-url`, while **Authorize GitHub data** calls
`GET /github/auth-url`. A successful latter callback creates the personal
connection and changes its status capability to `personalData: ready`; the
separate-authorization panel and button then disappear. The current local
state remains `authorization_required`.

Therefore no live repository or GitHub Project browse/import was run: copying
OAuth credentials into a disposable user would test the wrong credential
family, and manufacturing a personal-App grant would not be live evidence.
The prerequisite is a completed `github_app` / `personal_data` callback against
the local API. This initial diagnostic read no tokens, state values, redirect
codes, or secrets and changed neither the user's data nor any GitHub resource.
The following section records the successful later authorization and live pass.

## Live personal-App browse and import follow-up

The test administrator subsequently completed the separate personal-data flow.
A read-only check found a consumed `github_app` / `personal_data` state and a
connected `github_connections` row with access-token, refresh-token, and expiry
fields present. The encrypted values were copied as ciphertext only into a
fresh synthetic administrator in `gitiempo_qa_live_import_20261013_safe`; the
development user, workspace, and all of their records remained untouched.
Before the helper creates its Nest application or writes the target database,
it requires a source access-token lifetime of at least 15 minutes and an
unexpired refresh token. The target URL must resolve to a loopback host, use a
`gitiempo_qa_live_import_` database name, and differ from the parsed source
database name. The helper overrides its own `GithubOauthClientService.refresh`
provider to throw and records the refresh-attempt count; the completed run
reported `0`, so the copied refresh credential could not issue a GitHub token
refresh request. Earlier disposable runs that copied both ciphertext fields
were already dropped; no plaintext credential was read or logged.

The isolated Nest application used Fake Firebase QA login while making
read-only GitHub calls with that personal-App credential. It allowed both
`My-test-org-for-clock` and `ITSUA-team` only in the disposable workspace
policy. Results:

| Check | Live result |
| --- | --- |
| `GET /github/repos` | `200` for both permitted organizations; an accessible repository candidate was selected from the response. |
| `GET /github/projects` | `503` for `My-test-org-for-clock` from the provider client; `200` for `ITSUA-team`, where an accessible GitHub Project candidate was selected. |
| Repository import with an existing external reference | `200`, result `already-imported`, and the exact external project ID was retained. The project remained `external-reference` with `user-supplied` provenance and null `syncedAt`; its seeded task/time-entry history remained one row and it gained no assignment. |
| Ordinary repository import | `200`, result `imported` for a different live repository, creating the normal managed project path. |
| GitHub Project import into an inactive external mapping | `200`, result `failed` with the external-reference ownership message. The live board read succeeded first; import did not take over the inactive external project or create another project. |
| Active managed repository versus board import | `200`, result `repository-taken`; no board mapping was written while the managed repository project remained active. |
| Inactive managed repository reassociation | After deactivation, the same live board import returned `imported`; the repository reference moved to the new managed board project. |
| Credential and policy removal in QA | A missing organization allow-list and then a removed personal credential each returned `404` for browse and `failed` for repository import. The project/reference counts did not change, so neither path fell back to external creation. |

The disposable database was dropped after the final run, removing the copied
ciphertext, QA sessions, and all QA projects/tasks/time entries. No GitHub
write was issued. The `503` on the My-test organization Projects listing is a
provider-client outcome captured as a separate browse gap, not a claim that the
ITSUA board listing failed.

# Final API QA — managed routing, connection lifecycle and races

**Date:** 2026-10-13  
**Target:** isolated local PostgreSQL 17 cluster on port `55482`, database
`gitiempo_qa_api_final_20261013`, with migrations through `0022` and the
standard seed. All identities, workspaces, mappings, time entries and the
cluster belonged to this run. GitHub transports used deterministic adapters;
no GitHub write or production credential was used.

## Fresh actual HTTP and database evidence

| Coverage | Result |
| --- | --- |
| Managed repository routing and role boundary | Assigned member started a mapped private issue through the managed path. Unassigned member was denied with `project_assignment_required`; the denial left tasks, entries and assignments unchanged. Existing role coverage also passed for unassigned PM on public mapping and admin on private mapping. The managed route never switched to external materialization. |
| Managed installation and organization lifecycle | Controlled installation setup/reverify and organization-authorization HTTP suites passed. Missing personal connection, absent organization authorization, bad replacement app/org, insufficient permissions, suspended and disconnected installation states were denied on the managed route. A running owned timer remained stoppable after lifecycle loss. |
| Provider outage and rate limit | A fresh managed-reference HTTP fixture returned `503/github_provider_unavailable` for independently labeled outage and rate-limit adapter outcomes. Each compared project/task/entry counts before and after: the existing managed project remained, and zero task or time-entry rows were created. |
| External personal-link independence | Fresh external-reference starts/repeats/stops passed with no provider, installation, or personal-connection call. The controlled route has no branch on a user link, so absent/expired/revoked/disconnected personal-link state cannot change that result. Full personal disconnect separately preserved installation-backed tracking and assignment enforcement. |
| Private/public and board boundaries | Managed public/private role evidence, the live read-only managed ITSUA issue check, and controlled inactive external-board refusal passed. Board import cannot take over an external mapping; active managed repository versus board reports `repository-taken`; inactive managed reassociation follows the documented managed import behavior. |
| Reference/import race | A controlled repository import paused after provider verification; an overlapping external reference start won. Resumption returned `already-imported`, preserving one external project and no provider fallback. |
| Authorization removal at write boundary | Controlled managed requests paused after provider verification. Removing assignment returned `403/project_assignment_required`; removing membership returned `401`. Both database snapshots had zero new tasks and entries. |
| Same user, two workspaces | A fresh helper sent concurrent external starts using tokens for the same member in two workspaces. HTTP statuses were `201` and `409`; exactly one running entry existed globally and the winner stopped with `200`. |
| Same issue, case variants, two members | Two ordinary members concurrently started `FinalRace/<id>Case#2` with canonical and lower-case repository forms. Both returned `201`; exactly one repository ref and one issue ref existed and both responses used their IDs. Both owned entries stopped with `200`. |

The controlled helper made **12 assertions**. It was removed after the run.

## Commands and results

```text
pnpm exec drizzle-kit migrate --config drizzle.config.ts
pnpm exec tsx --env-file=.env src/db/seed.ts

vitest: external-github-tracking,
external-github-tracking-completion,
github-installation-tracking,
github-disconnect-tracking-http
→ 4 files, 21 tests passed

vitest: github-installation-setup-http-acceptance,
github-partial-permission-http-acceptance,
github-organization-discovery-http-acceptance
→ 3 files, 13 tests passed

vitest: time-entries
→ 1 file, 49 tests passed

temporary manual-final-race-qa
→ 12 assertions passed

temporary manual-provider-failure-qa
→ 10 assertions passed
```

All calls above used `NODE_ENV=test` and the isolated QA database URL.
The suites exercise Nest through real HTTP handlers with PostgreSQL
transactions; provider state and race pausing are controlled adapters.

## Literal task audit

- **9.7:** Complete at the required managed-routing API level. Actual HTTP
  coverage includes assigned/unassigned members, assigned/unassigned PMs and
  admin, public/private projects, repository and board mappings, existing
  issue ownership over repository mapping, and no-fallback/no-metadata denials.
  The board cases are controlled provider fixtures, as permitted by the task.
- **9.8:** External recording is proven independent of all personal-link state
  by zero-call assertions and start/repeat/stop behavior, while managed
  lifecycle denials, provider outage and provider rate-limit handling have
  controlled HTTP proof. Personal disconnect remains independently verified
  against installation-backed tracking.
- **9.20:** Same-issue/case, same-user cross-workspace global timer,
  import/reference overlap, and membership/assignment removal before commit
  all have fresh HTTP/DB proof. Two independent ordinary members retain
  separate successful entries for the same shared identity.

## Cleanup

Before disposal, the first database contained zero non-seed workspaces, zero
`@example.test` QA users, zero external-reference projects and zero running
entries. The second database contained no rows after its fixture `finally`
cleanup. Both dedicated databases and PostgreSQL clusters are removed after
this record is written. No development database, user entry, GitHub resource
or credential was modified.

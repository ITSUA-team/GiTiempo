# API controlled-request QA — external GitHub tracking

Run: 2026-10-13T08:25:30Z  
Build base: `75cdb08d` (`pnpm --filter @gitiempo/api build`) plus the
uncommitted external-tracking implementation changes in this workspace. This is
not an implementation commit identifier.  
API: local temporary process on port 3019, `NODE_ENV=test`  
Database: disposable `gitiempo_isolated` PostgreSQL cluster only; no shared or
development database was used.

## Fixture

Created two disposable workspaces:

- **External Tracking QA**: admin, ordinary member, and peer member.
- **Foreign QA**: a separate ordinary member identity.

The controlled reference payload used the user-authorized public repository
`ITSUA-team/GiTiempo` and canonical issue URLs. The API was not asked to fetch
GitHub data for any external-reference request.

`0022_external_reference_project_policy` was already applied in the isolated
cluster before this run. It establishes case-insensitive reference uniqueness
and the persisted external-reference policy. No migration was applied during
QA.

## Requests and observed responses

| Scenario | Request summary | Observed result |
| --- | --- | --- |
| First external start | Ordinary member `POST /time-entries/timer/start-from-github-reference` for issue 1 | `201`; `source: extension`, `isBillable: true` |
| Reference persistence | Read the created rows in the isolated DB | project `tracking_mode=external-reference`, `visibility=private`; project and task refs have `reference_provenance=user-supplied`, `synced_at=null` |
| Repeat by another member | Peer submits the identical reference after the first timer is stopped | `201`; same project ID and same task ID as the first request |
| Own-time detail | Member `GET /projects/:id` | `200`; `accessScope=own-time`, `canManageTasks=false`, `members=[]`, `assignedMembersSummary=null`, `trackingMode=external-reference`, `referenceProvenance=user-supplied` |
| Own-time entries | Member `GET /projects/:id/time-entries` | `200`; one item, owned by the requesting member, with `source=extension` and `isBillable=true` |
| Cross-workspace isolation | Foreign-workspace user `GET /tasks/:id` | `404` |
| External mutation denial | Own-time member `PATCH /tasks/:id` | `404` |
| Legacy managed route guard | Own-time member `POST /time-entries/timer/start-from-github` for the external reference | `404` |
| Global running timer | Same member starts two different references concurrently | one `201`, one `409`; the winner was then stopped |
| Case-insensitive materialization race | Member and peer concurrently submit `ITSUA-team/GiTiempo#6` and `itsua-team/gitiempo#6` | both `201`; both responses returned the same project ID and task ID; both timers were stopped |

The API calls used valid temporary access tokens, which are not included here.
Response bodies were reduced to status codes and policy-relevant fields.

## Coverage boundaries

- This QA verifies API behavior only. Browser extraction, extension storage, and
  UI rendering are covered by the separate browser QA session.
- GitHub import versus reference-materialization concurrency is covered by the
  data/service automated tests. Manual API QA intentionally did not invoke a
  provider-backed import because the controlled external-reference route makes
  no GitHub I/O.
- After browser QA, the API lane deleted its disposable fixture workspace/users
  and four restricted token/session files, then stopped its temporary API.
  Root subsequently stopped and removed the owned isolated PostgreSQL cluster.

# API manual QA — roles, access and managed fallback

**Date:** 2026-10-13  
**Target:** isolated local QA API (`127.0.0.1:3019`) and disposable PostgreSQL QA database  
**Method:** authenticated HTTP calls using five synthetic identities (admin, two members, assigned PM, unassigned PM). No development or production workspace was queried or changed.

## Preconditions

- Created disposable workspace `0f159a4a-1637-4340-9996-f857f7c40275`.
- Created a public and a private managed repository project, each with a mapped GitHub task; assigned one member and one PM to the public project, and the member to the private project.
- Created two external-reference issues in the same private external project, one owned by each member. The external project ID was `dac87c9f-c9f5-4c5c-9a8b-566a0a9a2ab3`.
- The QA API deliberately had no GitHub App credentials. Managed provider-success verification therefore remains outside this run.

## Results

| Area | Steps | Expected | Actual |
| --- | --- | --- | --- |
| Managed saved task — roles | Assigned member started/stopped a public managed task; unassigned member attempted the same; unassigned PM used public task; admin used private task. | Assignment applies to member GitHub tasks; public PM and admin retain established access. | `201/200`, `403`, `201/200`, and `201/200` respectively. The member denial left project/task/entry/reference counts unchanged. |
| External start without App | Each member started and stopped a distinct issue in an unmapped repository through `start-from-github-reference`. | External tracking does not require GitHub App credentials. | Both starts returned `201`; both stops returned `200`. |
| Own-time read isolation | Owner requested project list, project entries, and task list for the external project containing a peer's task and entry. | `accessScope: own-time`, empty members, no management capability, and no peer task or entry. | All requests returned `200`; scope was `own-time`, `members` was `[]`, `canManageTasks` was `false`, task list returned one owner task, and peer task/entry were absent. |
| Own-time mutation isolation | Owner attempted generic task creation, project update, and assignment mutation. | No shared mutation; no writes. | Returned `404`, `403`, and `403`. Before/after counts were identical: 3 projects, 4 tasks, 5 entries, 3 project refs, 4 task refs. |
| External saved repeat and state | Owner restarted saved exact external task; task then set inactive and closed before repeat reference starts. | Saved own-time repeat works; inactive/closed tasks reject without writes. | Repeat `201/200`; inactive and closed starts each `422`; counts unchanged for each denial. |
| Removed membership | Second member started an own external timer, then membership was removed. Attempted a new start, stopped existing timer, and read historical entry. | New starts fail; owned active timer can stop; own history remains readable. | New start `401` with no row changes; conditional stop `200`; historical entry `200`. |
| Management summary | Admin, assigned PM, and member requested management summary. | Admin/PM allowed; member denied. | `200`, `200`, `403`. |
| Reports | Admin, assigned PM, unassigned PM, and member requested time report. | Admin and PM retain report scopes; member has no report access. | `200`, `200`, `200`, `403`. The PM requests were server-scoped; this run did not use a live provider-backed project. |
| Managed lifecycle no-fallback | With mapped `QAOrg/public-repo`, inserted suspended, unavailable, disconnected, then absent installation states; each actor invoked reference start. | Managed route is denied and never materializes an external project/task/entry. | Each request returned `403`; project/task/entry/reference counts stayed at 3/4/7/3/4 after every denial. |

## Follow-up: PM report scope, exports and invalid reference inputs

| Area | Steps | Expected | Actual |
| --- | --- | --- | --- |
| PM own-time does not expand report scope | Unassigned PM created and stopped a private external task, then requested a project-grouped report. | Own-time participation does not make the external project reportable; only the public managed project remains in PM scope. | External task start/stop returned `201/200`; report returned `200` with one project row, and its IDs did not include the PM's external project. |
| Report export eligibility | Submitted a valid minimal report document as unassigned PM, admin, and member. | Admin/PM can export an already-authorized report; member cannot. | PM `200`, admin `200`, member `403`. The export endpoint renders a caller-provided document and does not query report data, so report scoping was proven separately by `POST /reports/time`. |
| Canonical reference URL | Submitted a URL with the wrong issue number and a URL with the wrong repository. | Reject before any materialization. | Both `400`; counts stayed 4 projects, 5 tasks, 8 entries, 4 project refs, 5 task refs. |
| Issue number and URL safety | Submitted zero and negative issue numbers, `http`, foreign-host, and board URLs. | Reject before any materialization. | All five `400`; the same counts remained unchanged after every request. |
| Title and authority safety | Submitted empty, overlong, and newline-containing titles; submitted extra `workspaceId`, `userId`, and `projectId` fields. | Reject invalid text and client-supplied authority claims before any materialization. | All four `400`; the same counts remained unchanged after every request. |

## Coverage notes

- 79 assertions passed across the original and follow-up runs; no unexpected HTTP result or write was observed.
- The first lifecycle fixture pass accidentally targeted an unmapped repository and correctly materialized an external record. It was discarded as evidence; the recorded results above are from a fresh fixture targeting the managed mapping.
- A successful provider-verified managed start, private-provider resource visibility, provider outage/rate-limit behavior, and real GitHub installation verification cannot be claimed here because the isolated QA API intentionally has no GitHub App credentials. The failed lifecycle checks only establish no-fallback behavior.
- Fixture rows remain in the isolated QA database for final cleanup by the coordinating QA pass.

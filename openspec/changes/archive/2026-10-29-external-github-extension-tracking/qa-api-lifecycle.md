# API controlled lifecycle QA — scenarios 9.6, 9.14 and 9.15

Run: 2026-10-13, local temporary API on port 3019, `NODE_ENV=test`.  
Database: separate disposable workspaces in the isolated PostgreSQL cluster.

This run did not use the browser-QA users, session files, or workspace. It used
new ordinary-member, peer-member, and foreign-workspace identities. Requests
used canonical references to the user-authorized `My-test-org-for-clock/test-repo`
repository. Access tokens are omitted.

## 9.14 — owned entry lifecycle and manual edits

| Check | Expected | Actual |
| --- | --- | --- |
| Create completed manual entry on an owned, active/open external task | `201`, `source=manual` | `201`; `source=manual` |
| Edit completed entry interval and description | `200`, updated duration/description | `200`; description `edited lifecycle entry`, duration `7200` seconds |
| Move completed manual entry to another active/open task with caller-owned history | `200` | `200`; task ID changed to the owned issue-103 task |
| Create manual entry against peer-only sibling task | deny before write | `404`; isolated DB shows member has zero entries for issue 102 |
| Create manual entry against a foreign-workspace task | deny before write | `404`; foreign user has zero entries |
| Delete a running owned entry | `409` | `409` |
| Stop that running owned entry | `200` | `200` |
| Delete it after stop | `204` | `204` |

The fixture had a member-owned issue-101 entry and peer-owned issue-101/102
entries. Database assertions after the denied writes and lifecycle cleanup were:

| User | Issue 101 entries | Issue 102 entries |
| --- | ---: | ---: |
| Ordinary member | 1 (fresh restored reference) | 0 |
| Peer member | 1 | 1 |
| Foreign-workspace member | 0 | 0 |

## 9.15 — own-time visibility after move/delete and reference restoration

| Check | Expected | Actual |
| --- | --- | --- |
| Delete member’s original issue-101 entry after moving the manual entry away | `204`; no own entry remains on issue 101 | `204` |
| Read issue-101 task as that member | hidden | `404` |
| Start an issue-101 timer while hidden | task becomes visible while running | `201`, followed by task `200` |
| Delete that running timer | blocked | `409` |
| Stop then delete all remaining member entries | own project disappears | stop `200`; deletes `204`; project read `404` |
| Read the same project as peer with historical own entries | peer visibility unchanged | `200` |
| Start issue-101 reference again after the member lost visibility | reuse existing mappings | `201`; project ID and task ID exactly matched the original issue-101 IDs |

The restored mapping comparison was exact:

- original project ID = restored project ID
- original issue-101 task ID = restored task ID

## Result

Both scenarios are fully covered with actual HTTP response statuses and
isolated-database postconditions. The disposable lifecycle fixtures are removed
after this evidence is recorded; browser-QA fixtures and the temporary API stay
running.

## Follow-up authorization gaps closed

A second, independent disposable fixture verified the remaining target and
retained-access cases requested during QA review.

| Check | Expected | Actual |
| --- | --- | --- |
| Move a completed owned entry to a peer-only hidden task | deny before write | `404` |
| Move it to a task in another workspace | deny before write | `404` |
| Move it to an owned inactive task | validation rejection, no move | `422` |
| Move it to an owned closed task | validation rejection, no move | `422` |
| Patch a peer-owned completed entry | deny before write | `404` |
| Delete a peer-owned completed entry | deny before write | `404` |
| Compare peer row before/after those requests | unchanged shared row | exact equality for task, description, duration, billable flag, and completed state |
| After deleting every own entry, read explicitly assigned external project | explicit access retained | `200`, `accessScope=project` |
| After that deletion, read peer-created sibling task B through assignment | explicit task access retained | `200`, `accessScope=project`, `canManageTasks=true` |
| Read the same project as workspace admin after member deletion | role-based access retained | `200` |

The follow-up fixture is also disposable and is removed after the independent
reference-materialization checks below. It has no shared browser-QA identity or
token.

## 9.6 — reference identity, per-user visibility, and workspace isolation

A third disposable fixture used three ordinary members in one workspace and a
fourth member in a second workspace. All starts used the external-reference
endpoint, so no provider fixture or GitHub I/O was involved.

| Check | Expected | Actual |
| --- | --- | --- |
| Second member reads project/task before recording any own time | hidden | project `404`, task `404` |
| Second member records a different issue in the same repository/project | project is usable but original issue remains hidden | start `201`; original issue task remains `404` |
| Second member records the original issue | reuse project and task identity | `201`; both IDs exactly equal the original IDs |
| Third member submits casing variant of the original repository reference | case-insensitive reuse | `201`; both IDs exactly equal the original IDs |
| Second workspace records the same issue | independent mapping namespace | `201`; project and task IDs differ from workspace one |
| Second-workspace user reads first-workspace task by ID | no cross-workspace visibility | `404` |

These fixtures, like the extended lifecycle fixture, were removed after the
checks. Browser-QA identities, files, and temporary API process were not used
or changed.

## Final evidence for initial discovery, sibling retention, and shared-row integrity

A final, fourth disposable fixture used two ordinary members in one new
workspace. Member A recorded and stopped issue 401; member B had no project
assignment and no time entries at that point. All reference payloads used the
strict canonical public GitHub URL form. The fixture was deleted immediately
after the assertions.

| Check | Expected | Actual |
| --- | --- | --- |
| B lists projects before recording time | external project absent | `GET /projects` `200`; response contains no A project ID |
| B lists A project tasks before recording time | undiscoverable | `GET /projects/:id/tasks` `404` |
| B records issue 402 in the same repository | same project, a new task | `201`; returned project ID exactly equals A's issue-401 project ID |
| B reads issue 401 before own time on it | sibling remains hidden | `404` |
| B records then deletes B's final completed entry on issue 401 | issue 401 becomes hidden for B | start/stop `201`/`200`, delete `204`, then task A `404` |
| B reads owned issue 402 after losing issue-401 visibility | B remains visible with own-time scope | `200`; returned task ID equals issue-402 task ID and `accessScope=own-time` |
| Project/task rows and A's peer history before vs. after B's issue-401 start/delete | no shared mutation | exact equality including project/task IDs, names/titles, visibility, tracking mode, active/status/default-billable flags, created/updated timestamps, and A's entry task/times/duration/description/billable/source values |

This closes the list-level discovery proof in 9.6 and the own-task-B retention
and shared-row immutability proof in 9.15. The fixture cleanup was verified
with zero matching users and workspaces in the isolated database.

After the frontend lane finished, the browser-QA fixtures and four restricted
session files were removed and the temporary API was stopped. Root then stopped
and removed the owned PostgreSQL cluster. No shared/development data was used.

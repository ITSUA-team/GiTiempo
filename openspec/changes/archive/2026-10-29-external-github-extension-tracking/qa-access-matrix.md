# Controlled read and mutation isolation

Run: 13 October 2026. Actual compiled candidate API on loopback 3041/3042, synthetic member/peer/admin sessions and a new disposable PostgreSQL database. Applied migrations through 0022; no development records or real GitHub resources were changed. The access/timer services were not mocked.

**71 assertions passed, zero failed.**

Two ordinary members recorded the same external issue. The peer also recorded a sibling issue; the owner created two completed manual entries on the exact already-authorized task. Requests then checked the actual own-time responses and mutations.

| Area | Observed result |
| --- | --- |
| Detail/list/task isolation | Project list/detail totals matched the owner's database duration sum. Detail returned `own-time`, `members=[]`, `assignedMembersSummary=null` and no `memberCount` or peer identity. Task list, including inactive, contained exactly the owned task; the sibling direct route returned 404 and its title was absent. |
| Entry pagination | Four project-entry requests with page size one returned the same owner-only total and exactly the owner's unique entry IDs. No peer entries or sibling tasks appeared. |
| Search/activity | Search for the peer-only sibling title returned zero items/count. Search for the owned task title returned only owned entries and the correct count. The personal project summary contained no peer identity. |
| Own-time shared mutations | Fourteen actual requests attempted generic task creation, title/status/active/default-billing edits, task deletion/backfill, project name/visibility/active/default-billing edits/backfill, assignment creation and assignment deletion. Every request returned 403 or 404. Exact before/after snapshots of projects, tasks, references, assignments and time entries were identical. |
| Explicit authority | Admin project/task metadata edits returned 200; external policy remained intact and caller mode conversion returned 400. Admin assignment returned 201; the assigned ordinary member then read both tasks and could edit a task. After assignment removal returned 204, the same member immediately returned to own-time and task editing returned 404. |
| Provider independence | Zero remote fetch/HTTPS calls were recorded during the run. |

The first helper expected description search, while the existing endpoint searches task titles. The helper was corrected to the documented task-title behavior; no product source change was needed. Both runs cleaned their owned databases. Final non-secret assertions are retained at `/private/tmp/gitiempo-access-matrix-qa.k6k_t9pa/evidence.json`, beside the cleanup record. Tokens were held only in memory.

This proves the direct-request mutation boundary. Subsequent review found the manual-entry selector still offered `New task` for own-time access. That mismatch is now repaired with server-capability gating and stale-selection guards. A fresh browser rerun listed only the exact owned task and saved an existing-task manual entry; deferred tests cover permission narrowing during creation and visible outcome feedback. Together with the management-control browser checks and authorized admin/assignment rerun, task 9.10 is complete. The subsequent actual browser combined-search, own-history pagination, Dashboard activity and existing-task picker checks are recorded in qa-web-completion.md. Together these close read-isolation task 9.9. The complete responsive/Firefox visual-state matrix remains separate under 9.21.

# User mutation refresh evidence

## Automated regression baseline and result

- Revision before this implementation: `4a035c61`.
- `src/lib/query-keys.spec.ts` first captured the failing project-A task invalidation expectation: the pre-change key was the whole `projects` family, which included project B.
- The replacement regression seeds project-A and project-B task collections in a `QueryClient`; invalidating the task-A mutation key marks A invalid and leaves B valid.
- Entry and timer mutation keys always revalidate time-entry lists, timer authority, and visible-project metadata. With a known old/new project they target only those project-task collections. A delete lacking a cached source uses the documented conservative whole-project fallback.
- `src/composables/query/index.spec.ts` retains stale-request tests for timer start/stop and asserts the older request signal is aborted before it can overwrite reconciled cache data.
- `src/composables/time-entries/useTimeEntriesData.spec.ts` drives A→B→C plus a workspace change while an old request is pending. The old workspace data is hidden before the new request resolves, and the late response cannot restore it.
- Known project mutations invalidate only current/eligible timer state and matching project task/options collections. They do not invalidate another project's timer options. The broad timer/projects prefixes occur only in the missing-source fallback.
- `src/composables/query/index.spec.ts` verifies that an update for an uncached time entry uses that conservative fallback. A create has no source by definition and does not widen invalidation solely for that reason.
- `src/composables/query/index.spec.ts` mounts active A and B project-task and timer-option queries in one real `QueryClient`, then updates a task in A. It observes the authoritative A task/options reads refetch exactly once and B task/options remain at their initial one read.
- The same query fixture covers an A→B→A scope-generation race: a late response from the original A generation is rejected and cannot mark the later A generation as current.

## Authenticated browser request counts

The clean Chrome DevTools captures supplement the query-client regressions.
They use project A plus five mounted unrelated task collections:

| Operation | A task-list reads | Unrelated B task-list reads | Notes |
| --- | ---: | ---: | --- |
| Known task edit | 1 | 0 | `candidate-task-edit-A-fixed`; one PATCH only. |
| Timer start | 1 | 0 | `candidate-timer-start-A-clean`; timer authority remains separately counted. |
| Timer stop | 2 | 0 | `candidate-timer-stop-A-clean`; one A read is Projects-owned and one is the authoritative idle-eligibility check. |

The timer’s returned project source is used for the narrow target. A manual
time-entry update with an unknown prior source remains intentionally broad: it
must invalidate conservatively because it may have moved from an unseen project.

## Operation coverage boundary

- Direct active-consumer request-count coverage currently exists for a known **task update** in A with B mounted.
- **Timer start/stop** have direct stale-read cancellation, authoritative cache, and captured-scope coverage, but not an A/B active task/options request-counter fixture. `startTimerFromGitHub` has no separate direct mutation fixture.
- **Manual time-entry create/delete/update** have key-level/source-fallback and scope-safety coverage; the uncached update exercises the conservative fallback. They do not yet have individual active A/B request-counter fixtures for every known-source path.
- **Task create/delete** share `afterTaskMutation` with task update and have key-level coverage, but no separate mutation-hook request-counter fixture.

Those unlisted operation-specific counters remain acceptance/test-expansion gaps; this evidence does not represent them as measured request reductions.

## Focused verification

- `pnpm --filter user-web exec vitest run src/lib/query-keys.spec.ts src/composables/query/index.spec.ts src/composables/timer/useTopBarTimer.spec.ts --maxWorkers=1`
- `pnpm --filter user-web typecheck`
- `pnpm --filter user-web lint` (zero errors; existing warnings remain outside this change)

## Completed own-time mutation acceptance

The live localhost fixture now verifies the previously open own-time boundary:
deleting the sole entry through the User SPA revokes the private project/task,
and moving the replacement entry to a public destination revokes the old
project/task while retaining the destination. The fixture was cleaned up after
verification. See [own-time evidence](own-time-evidence.md) for screenshots,
database cleanup records, and the reconciliation-only request scope.

# Authenticated Chrome DevTools request evidence

## Method and scope

- **Baseline:** exact `4a035c61` (`docs: propose SPA data refresh improvements`).
- **Candidate:** the current uncommitted working tree based on `4a035c61`.
- **Browser:** headed Chrome for Testing 152, controlled through `agent-browser`
  and Chrome DevTools Protocol. No Computer Use permission, credential reading,
  token copying, or authentication bypass was used.
- **Environment:** local API at `http://localhost:3000`; User SPA and Admin SPA
  ran sequentially on `http://localhost:5173` and `http://localhost:5174`.
  Baseline source came from `/private/tmp/spa-refresh-baseline-4a035c61` on the
  same origins, so the browser used its normal local session.
- **Recorded data:** method, path, status, timestamp, and report request inputs.
  The durable raw evidence is
  [`evidence/cdp-network-counts.json`](evidence/cdp-network-counts.json). It
  contains no request or response headers, cookies, tokens, or request bodies
  except the non-sensitive report filter/page inputs required to distinguish
  legitimate pagination.

The project fixture is `GI Tiempo` / `Admin gitempo`. Six project task inputs
were mounted: project A `929af6ae-eddb-426e-8dfa-e0cfb7dba9f9` with task `tst`
`6a5c5d14-3ab9-4872-8f75-4b9dcb317c05`, plus five visible unrelated project
task inputs. “B” below means those five unrelated collections collectively.

## Completed task-edit requests

Both runs changed the local `tst` title and restored it immediately after the
measurement. Counts below include only the measured wave, not the restoration.

| Revision | Write | Project A task-list reads | Unrelated B task-list reads | Other authority work |
| --- | ---: | ---: | ---: | --- |
| Baseline `4a035c61` | 1 PATCH | 3 | 10 (2 for each mounted B input) | 2 projects, 2 current-timer, 1 recent-entry read |
| Candidate after final fix | 1 PATCH | 1 | 0 | none in the isolated wave |

This proves the known task-A edit budget in a real consuming page: it no longer
reloads task lists for unrelated visible projects. The candidate's one A list
read remains a targeted authoritative read.

## Timer and Time Entries measurements

The exact baseline shows why timer work must be separated from unrelated task
reads. A baseline start made one timer-start write, two current-timer reads,
one projects read, and two task-list reads for each of the six mounted projects.
A baseline stop made one timer-stop write, three current-timer reads, two
projects reads, one recent-entry read, three A task-list reads, and two reads
for every unrelated B task list.

The clean candidate timer rechecks exclude HMR and focus activity. Start made
one timer-start write, two current-timer reads, one projects read, one A
task-list read, and **zero** unrelated B task-list reads. Stop made one
timer-stop write, three current-timer reads, two projects reads, one recent
entry read, two A task-list reads, and **zero** unrelated B task-list reads.
The two A stop reads remain separately necessary: one is the Projects
collection update and one is the independent authoritative idle-eligibility
check. Earlier overlapping traces remain diagnostic-only.

The baseline fresh Time Entries return made one list read
(`GET /time-entries?page=1&limit=20`) along with independent visibility,
current-timer, and project-task checks. The clean candidate return made
**zero** such list reads; its visibility/current/project-task checks are
recorded separately. The fake-clock regression suite also verifies the
candidate's 30-second fresh reuse and stale retained refresh behavior.

## Reports: legitimate pagination and retained results

The candidate cold Reports load produced two `POST /reports/time` requests.
They had distinct project IDs and the same page-1/limit-100 request shape, so
they are required per-project report inputs rather than a duplicate wave.

On a stale retained return, Chrome observed the same two distinct project/page
inputs. The first response was held through DevTools for roughly 20 seconds;
the existing report row stayed rendered during the wait on desktop and mobile.
The second project/page request then completed the required report sequence.
The desktop and mobile evidence is in
[`evidence/cdp-reports-stale-desktop.png`](evidence/cdp-reports-stale-desktop.png)
and
[`evidence/cdp-reports-stale-mobile.png`](evidence/cdp-reports-stale-mobile.png).

On a fresh candidate return, the observed wave contained no
`POST /reports/time`; it contained separate page-entry metadata requests
(`workspace/settings`, projects, management summary, members, and saved
reports). Those reads are recorded as independent authority/metadata work.

The final exact baseline comparison was completed after normal Admin sign-in.
Both its fresh return (completed within 30 seconds) and its stale return made
two distinct `POST /reports/time` page-1 requests, one per project. The
candidate makes zero report POSTs on the corresponding fresh return, and its
stale return makes the same two legitimate project/page inputs while retaining
rows. Baseline preset create, save, rename, and delete each made one write plus
one `GET /reports/saved`; the candidate clean write windows contain only the
write.

## Failure continuity and presets

One scoped `POST /reports/time` was failed through DevTools. Existing rows
remained visible with a Retry control; after removing the injected failure,
Retry restored the populated mobile result. Evidence:
[`evidence/cdp-reports-failure-desktop.png`](evidence/cdp-reports-failure-desktop.png)
and
[`evidence/cdp-reports-failure-mobile.png`](evidence/cdp-reports-failure-mobile.png).

A disposable local preset was created, saved, renamed, and deleted. Each clean
write window contained exactly one write and no immediate saved-report list,
report-row, project, or member read:

| Operation | Measured request |
| --- | --- |
| Create | `POST /reports/saved` once |
| Save | `PATCH /reports/saved/{id}` once |
| Rename | `PATCH /reports/saved/{id}` once in the write-only window |
| Delete | `DELETE /reports/saved/{id}` once |

The full rename trace also contains page-remount traffic before the rename
write. It is deliberately excluded from the write-only conclusion; the
`candidate-preset-rename-write-window` record isolates the PATCH.

## Time Entries same-key failure continuity

The final scoped failure record contains one failed
`GET /time-entries?page=1&limit=20`. At both 1280px and 390px, the existing
groups remained mounted, the open edit dialog kept the unsaved description
`Unsaved local QA draft`, and focus remained on that field. Screenshots are
`evidence/cdp-time-entries-failure-desktop.png` and
`evidence/cdp-time-entries-failure-mobile.png`. The clean Retry capture then
made exactly one list request while its response was held for 18 seconds. The
same groups remained mounted throughout the desktop and 390px mobile delay;
after success, six rows and the paginator remained, updating cleared, and Retry
was absent. Evidence:
`evidence/cdp-time-entries-retry-desktop.png` and
`evidence/cdp-time-entries-retry-mobile.png`. The discarded original draft was
an intentional dialog close, not a loss during refresh.

## Workspace switch while a list request is pending

The `candidate-user-workspace-pending` run held the prior-workspace list read,
then switched through the UI to the existing member workspace. The old groups
disappeared immediately at desktop and stayed absent after the canceled delayed
request was released at 390px; the destination workspace was empty. The
expected DevTools cancellation cleanup logged `InvalidInterceptionId` after the
old request was canceled and does not indicate an application request failure.
Screenshots: `evidence/cdp-workspace-pending-desktop.png` and
`evidence/cdp-workspace-pending-mobile.png`.

## Own-time visibility reconciliation

The live User SPA fixture now covers first-entry visibility, last-entry
revocation through the mobile delete flow, and moving the final entry to a
public destination through the desktop edit flow. It confirms that old
private-project/task visibility is removed from selectors and search after the
entry no longer belongs there. The fixture was local-only and cleaned up;
details and screenshots are in [own-time evidence](own-time-evidence.md).

The associated network records include navigation and authority work, so they
are not used as isolated request-budget measurements.

## Limitations

This evidence does not make a percentage claim. It records exact completed
browser requests only for the scenarios with isolated completed-request
captures.

The automated fixtures in [baseline evidence](baseline-evidence.md) remain the
evidence for race, stale-response, scope, and full pagination behavior that
cannot be safely generalized from one live local session.

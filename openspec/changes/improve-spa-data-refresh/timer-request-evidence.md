# Timer request coalescing acceptance

## Revision and comparable captures

The original SPA refresh implementation was committed as `bcf14339` before
this follow-up began. The candidate is the subsequent working tree on
`improve-spa-data-refresh`. Only user timer/query ownership, tests, and
corresponding documentation change. No API, schema, dependency, notification,
markup, or theme change was needed.

Chrome for Testing 152 used ordinary sign-in and DevTools through
`agent-browser`; no computer-wide control or copied authentication state was
used. API/User SPA remained on localhost ports 3000/5173. Desktop was
1280×900 and mobile 390×844.

[Sanitized request records](evidence/timer-coalescing-network-counts.json)
contain methods, URLs, statuses, and timestamps, without credentials or
headers. Both baseline and candidate Projects captures use the existing `tst`
task in project A with six project task collections mounted. The baseline is
`baseline-bcf14339-projects-start-stale-desktop` and
`baseline-bcf14339-projects-stop-desktop`; the settled candidate is
`candidate-projects-start-desktop-settled` and
`candidate-projects-stop-desktop-settled`. Repeated captures agree.

| Resource | Baseline start | Candidate start | Baseline direct stop | Candidate direct stop |
| --- | ---: | ---: | ---: | ---: |
| Timer write | 1 | 1 | 1 | 1 |
| Current timer after write | 2 | 1 | 2 | 1 |
| Current timer preflight | 0 | 0 | 1 | 1 |
| Visible projects | 1 | 1 | 2 | 1 |
| A tasks | 1 | 1 | 2 | 1 |
| Recent own entry | 0 | 0 | 1 | 1 |
| Other five project task inputs | 5 | 5 | 0 | 0 |
| **Actual total** | **10** | **9** | **9** | **6** |

The five other task inputs are distinct existing refresh work, preserved in
both starts. Excluding them, the timer-related start budget falls from five
to four requests. This follow-up removes duplicate reads without claiming
that every unrelated task refresh was eliminated. The first candidate start
raced authentication/bootstrap and is retained as
`diagnostic-candidate-projects-start-auth-bootstrap`, excluded from comparison.
No full-page navigation occurred inside the measured mutation windows.

## Authority and ownership

The top bar and page now consume one canonical scoped current-timer query.
Focus revalidation is explicitly enabled even though the application default
is disabled. Direct-page stop still performs its current-state preflight,
and the write still carries the expected timer id.

Only a coordinated post-stop wave may reuse project/task/recent-entry
results. All affected dependencies are canceled and invalidated before
refetch. Reuse requires the canonical current response and each resource's
query update counter to advance after that boundary, with no outstanding
invalidation. Existing query functions are preserved. Ordinary idle/focus
checks continue to make direct authoritative eligibility reads. No longer
freshness allowance is granted to access decisions.

Closed/inactive or inaccessible tasks cannot become eligible idle context.
Task create/delete continue to revalidate eligibility; authoritative task
updates reconcile labels or clear an invalid selection. Late disabled or
old-workspace reads cannot restore a previous selection. Idle-context errors
do not hide a subsequently running timer, and retry recovers unchanged data.

## Browser results and design parity

- PASS desktop Projects start/stop: shared running/idle state, expected accessible
  actions, retained task content, and counts above.
- PASS mobile Projects start: one current read, one project read, one read for
  each mounted task input; same nine-request total as the desktop fixture.
- PASS mobile route transition to Time Entries while running, then direct stop:
  seven requests — the six-request stop budget plus one required visible
  `time-entries?page=1&limit=20` list refresh. Its separate `limit=1` read is
  idle eligibility, not duplicate list pagination. Preflight remains present.
- PASS cleanup reload: authenticated desktop Time Entries restored with idle
  controls and original records.

Approved `GITiempo.pen` frames `rLP7z`, `yAu6B`, `FRM1d`, `R2FI0`, and
`qTKvU` remain the parity reference. Reviewed [desktop running](evidence/timer-coalescing-desktop-running.png),
[mobile running](evidence/timer-coalescing-mobile-running.png), and
[mobile idle](evidence/timer-coalescing-mobile-idle.png) screenshots. Field
order, responsive branches, accessible actions, spacing, and timer strip
remain unchanged. No PrimeVue exception or new reusable UI pattern arose.

## Verification and cleanup

Regression tests cover active top-bar/page/Projects consumers; start/stop
request budgets; fully completed project/task responses before a deferred
recent-entry response; pre-wave stale data; ordinary access revocation;
A→B→A/logout; idle error recovery; and canonical focus refresh with global
focus refresh disabled. The focused four-file suite has 37 passing tests,
including eight summary tests.

Independent review approved the final authority and lifecycle logic, with no
remaining blocking findings. Root `pnpm typecheck`, `pnpm lint`, and
`pnpm test` pass; User SPA has 628 passing tests and Admin SPA 832
passing tests (unchanged packages use Turbo cache). Lint has existing
warnings and no errors. Strict OpenSpec validation and `git diff --check`
pass. The installed workspace reports an existing node_modules/lockfile sync
warning; no dependency installation or manifest change was needed. No
codebase-memory index tool is exposed in this session, so no reindex claim is
made. API production code is unchanged; backend integration tests were not
required for this follow-up.

All six timer entries created in this follow-up were stopped, then deleted
only after matching their exact task/user/workspace and recorded start
windows. [Cleanup proof](evidence/timer-coalescing-cleanup.json) confirms zero
remaining follow-up entries. Earlier user/QA records were preserved. The
owned request recorder was stopped; user-owned development servers and
Chrome were left running. The follow-up is not committed, pushed, archived,
or deployed by this acceptance record.

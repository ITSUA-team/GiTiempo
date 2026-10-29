# Final web QA evidence

Date: 2026-10-13  
Source revision: `e0714382` plus the narrowly scoped Admin report and User Manual Entry corrections documented below.  
Environment: isolated local PostgreSQL databases `gitiempo_qa_web_final_next_20261013` and `gitiempo_qa_web_final_dialog_20261013`; APIs `http://127.0.0.1:3053` and `:3055`; user web `:5392` and `:5395`; admin web `:5393`; Fake Firebase identities and synthetic fixture data only. No GitHub provider credential, customer repository, or production data was used.

## Fixture and safety

- Workspace A contains an external private project with a member's own completed task, a peer's completed task, an inactive external project with a completed entry, and an assigned managed project.
- Workspace B contains only an unrelated project. The member belongs to both workspaces until the explicit membership-removal check below.
- The PM is assigned only to the managed project. The external project's `accessScope` is `own-time` and has no assignment.
- Each browser used its own named `agent-browser` profile. Screenshots named below are stored under `/private/tmp`; their content is synthetic.

## New browser evidence

### Own-time visibility, lifecycle, and membership reconciliation

- Desktop member Projects view displayed only **QA Next own external issue** in **QA Next External Repository**, with the own-time notice and no peer task, Add task, or Edit project control. Direct Start then Stop completed successfully. Evidence: `qa-web-final-next-member-projects-desktop.png` and `qa-web-final-next-member-projects-running.png`.
- The desktop global timer picker selected that exact external project and own task. Evidence: `qa-web-final-next-member-topbar-picker.png`.
- Switching the same session from Workspace A to Workspace B cleared the external project card and task link; switching back restored the member's own project. Evidence: `qa-web-final-next-member-workspace-b.png`.
- With the picker dialog open, the test removed this synthetic member's Workspace A membership in the QA database. A real browser tab-focus transition then cleared the dialog and all Workspace A project/task data. The route remained `/projects`; this run asserts stale selection/data removal, not a mandatory redirect or 403 presentation.
- A later focused fixture found the same stale-selection failure in **Manual Entry**: after the selected own-time project/task lost workspace membership, its open dialog kept the task selected. The dialog workflow now clears project and task only when an authoritative visible-projects update removes a previously visible selected project. It also prevents an in-flight edit request from restoring a target after the dialog changed or cleared, and blocks a create save when its selected project is no longer visible. The selected target is retained through an ordinary refresh that still contains it.
- Browser retest: selected **QA Dialog External / QA Dialog own issue** in Manual Entry, removed its synthetic current-workspace membership, then switched browser tabs to trigger a real focus transition. The dialog closed and no stale target or Save control remained. Evidence: `qa-web-final-dialog-fixed-before.png` and `qa-web-final-dialog-fixed-after-membership-loss.png`.
- A distinct task-scope fixture retained **QA Dialog External** through **QA Dialog retained issue** while removing the selected **QA Dialog own issue** entry. A real tab-focus transition cleared the selected task from the still-open Manual Entry dialog; opening its task list exposed only **QA Dialog retained issue**. The same focus transition now refreshes History: it shows only the retained task and `Today, Oct 13 1h`, rather than the removed task's stale entry. Evidence: `qa-web-final-task-loss-fixed-final.png`, the option-list browser snapshot recorded alongside `qa-web-final-task-loss-fixed-task-options.png`, and `qa-web-final-task-loss-history-refreshed.png`. The focused regression clicks Save after the task is cleared and asserts that it makes no create request; existing validation handles the empty required selection.
- The managed PM Projects page exposed only the assigned managed project; it did not expose the external own-time project. The managed saved task started and stopped successfully. Evidence: `qa-web-final-next-pm-projects-desktop.png` and `qa-web-final-next-pm-projects-mobile.png`.
- No timer was left running: `select count(*) from time_entries where ended_at is null` returned `0`.

### Admin reports, inactive projects, CSV, and responsive states

- Initially, Admin Projects listed **QA Next Inactive External** with 1h but the default Admin Reports view omitted it. This violated the explicit admin full-scope requirement.
- Root cause was frontend project selection: `getVisibleReportProjectsForScope` excluded inactive projects for every role even though backend scope filtering limits inactive projects only for PMs.
- The fix now passes the existing `isAdminScope` to that helper: admins include all projects with time; PMs still include active projects only. It changes no layout or approved `Admin Reports V2` design behavior.
- After the fix, the desktop report shows **QA Next External Repository** (2h) and **QA Next Inactive External** (1h). Evidence: `qa-web-final-next-admin-reports-after-fix.png`.
- Downloaded CSV content was inspected, not just triggered. It contains both rows and `Total, 3h 00m`; evidence file: `qa-web-final-next-admin-report.csv`.
- The Admin Projects and Reports screens render the same synthetic external/inactive data at `390x844`. Evidence: `qa-web-final-next-admin-projects-mobile.png` and `qa-web-final-next-admin-reports-mobile.png`.
- At `390x844`, the own-time help control exposes its full accessible label, receives focus, opens through click, and dismisses with Escape and an outside click. The original mobile open screenshot clipped the text at the right edge; the responsive placement correction constrains it to 16px viewport margins. Current evidence: `qa-web-final-tooltip-mobile-fixed-current.png`; the full-width visual confirmation is `qa-web-final-tooltip-mobile-fixed.png`.

## Automated verification for the report correction

- `pnpm --filter admin-web test -- useReportsData.spec.ts` completed with **66 files / 570 tests passed**. The script's Vitest invocation ran the full configured admin suite; the known jsdom canvas notices were non-failing.
- `pnpm --filter admin-web lint` completed with **0 errors** and two pre-existing warnings in `src/views/GithubCallbackView.vue`.
- `pnpm --filter admin-web typecheck` passed.
- Added regression coverage asserts an admin report requests the inactive project and a PM report does not.
- `pnpm --filter user-web exec vitest run src/views/TimeEntriesView.spec.ts src/components/time-entries/TimeEntryDialog.spec.ts src/components/projects/ProjectsTaskSection.spec.ts` passed **3 files / 80 tests**. These include the project-revocation, task-only loss, in-flight save guard, inactive owned-entry, and tooltip keyboard-dismissal regressions.
- `pnpm --filter user-web lint` completed with **0 errors** and 11 pre-existing warnings; `pnpm --filter user-web typecheck` passed. The integration owner then ran the fresh full user suite (**52 files / 547 tests passed**) and Turbo user build successfully.

## Literal task status contribution

This document contributes evidence only; task checkbox ownership remains with the parent.

| Task | New evidence | Status from this pass |
| --- | --- | --- |
| 6.4 | This pass's own-time/managed browser checks plus `qa-web-lifecycle.md` final-entry, mobile, two-tab and stale-header evidence | **Complete in combined QA evidence.** |
| 7.2 | This pass's Admin/PM UI evidence plus `qa-api-completion.md` real-import conflict checks | **Complete in combined QA evidence.** |
| 9.1 | User/admin desktop/mobile screenshots, the approved `Admin Reports V2` surface, and prior visual QA artifacts | **Complete in combined QA evidence.** |
| 9.13 | This pass's Projects/picker/managed starts plus `qa-web-completion.md` Dashboard, History, top-bar, and Manual Entry starts and API stale-ID denials | **Complete in combined QA evidence.** |
| 9.16 | Earlier assignment/role/cache coverage, prior open-picker reconciliation, and this pass's Manual Entry stale selection reproduction/fix/retest | **Complete in combined QA evidence.** |
| 9.17 | Fixed and browser-verified admin full report/CSV including inactive data; PM active-only regression, with prior role/export denial coverage | **Complete in combined QA evidence.** |
| 9.21 | Responsive own-time help and access checks retain their recorded runtime evidence. | **Complete in combined QA evidence.** The 14 October Projects patch resolves the focused header/badge/help/table/mobile-card differences; see qa-projects-parity-final.md. |

## Scope limits

This is a controlled local browser fixture. It does not replace the separately recorded real GitHub extension checks or user-attested Firefox checks. It makes no claim about published-store privacy wording, production deployment, or a comprehensive cross-browser/provider matrix.

## Cleanup

- The earlier `gitiempo_qa_web_final_next_20261013` fixture was cleaned after its checks. The dedicated Manual Entry fixture `gitiempo_qa_web_final_dialog_20261013` was dropped after the final Task A/Task B retest; both synthetic fixture helpers were removed.
- The dedicated API and Vite processes were stopped. Local ports `3053`, `3055`, `3057`, `5392`, `5393`, and `5395` were verified not listening.
- The named `agent-browser` QA session has no fixture tab remaining: the spare tab was closed, the final tab's local/session storage was cleared, and it was navigated to `about:blank`.


## Projects completion — 14 October 2026

The focused visual audit is now closed. The current renderer passes 551 User
regressions / 52 files, lint/typecheck and root Turbo build, with desktop/mobile
browser geometry and interaction checks plus independent review. See
[Projects parity evidence](qa-projects-parity-final.md) and its inspected
screenshots. This supersedes the earlier 547-test checkpoint for User source.
Admin and prior API-backed lifecycle evidence remain unchanged. The new browser
fixture used no backend and supplements rather than replaces that evidence.

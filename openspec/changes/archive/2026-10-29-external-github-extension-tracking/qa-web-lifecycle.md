# Manual web lifecycle QA

Run: 2026-10-13. Isolated API: `http://localhost:3019`; User SPA: `http://localhost:5183`; Admin SPA: `http://localhost:5184`.

All accounts and records below were created only in the disposable `QA web` workspace. No personal browser profile, user session, production service, or development database was used.

## Results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Member own-time desktop and mobile Projects | Pass | The member saw only `Web QA own issue A`, the External tag, direct GitHub link, own-time `?` hint, and Start/Stop. No Add/Edit task controls or peer task appeared. `member-projects-own-desktop.png`, `member-project-own-mobile.png`. |
| Own-time accessibility | Pass | The hint opened on click and `Escape` closed it. The trigger exposes the full own-time explanation as its accessible name. |
| Projects repeat start/stop | Pass | Start changed to Stop, the running state disabled competing starts, and Stop restored Start. `member-running-desktop.png`, `member-after-stop.png`. |
| History repeat start/stop | Pass | A completed external entry exposed Start; it produced a running entry with Stop and disabled prior starts; Stop completed it. `member-history-repeat-running.png`, `member-history-repeat-stopped.png`. |
| Dashboard repeat-start surface | Pass | Recent Time Entries and Top Focus showed only the member's saved external task and a usable Start action. `member-dashboard-own-time.png`. |
| Admin project visibility | Pass | Admin Projects desktop showed `GitHub Repo`, `External`, `Private`, zero assignments and zero hours. The mobile card/tag is in the viewport and legible. `admin-project-external-mobile-card.png`. |
| Admin vs PM/member scope | Pass | User SPA admin saw all three test tasks plus Add task/Edit task controls. PM, who only had own time and no explicit project grant, saw the same own-time restriction as a member, without peer tasks or management controls. `pm-projects-desktop.png`. |
| Final-entry delete and derived disappearance | Pass — root follow-up | After explicit user authorization, root used a fresh isolated session and real Edit → Delete entry → Delete UI confirmations to delete all four own completed entries. History emptied; second Projects tab hid the project/task on refocus without reload. DB retained the shared project, all three tasks and both peer/PM entries. Screenshot: `member-projects-final-delete-refocus.png`. |
| Move-last-entry lifecycle | Not run | Kept pending with the same final-entry lifecycle block. |
| Refocus/API-change cache reconciliation | Partial — two defects fixed, wider matrix pending | The initial run hid the project but retained a stale top-bar issue link. Focus refresh was added to timer summary. A second race was repaired by refreshing parent visibility before still-visible child tasks. All 537 User SPA tests, typecheck/lint and build passed. Fresh actual two-tab mobile rerun after last-entry deletion removed the card/header link without reload or task-load toast (`member-refocus-fixed-mobile.png`, inspected). Other role/workspace transitions remain pending. |

## Screenshots

Evidence is retained under `/private/tmp/gitiempo-manual-qa-gscHOc/`:

- `member-projects-own-desktop.png`
- `member-running-desktop.png`
- `member-after-stop.png`
- `member-history-before-delete.png`
- `member-history-repeat-running.png`
- `member-history-repeat-stopped.png`
- `member-dashboard-own-time.png`
- `member-project-own-mobile.png`
- `pm-projects-desktop.png`
- `admin-project-external-mobile-card.png`

## QA fixture ownership

Fixture: `web`; workspace ID: `fbc89ffd-2339-44c1-be64-b227320c8ac0`.

Disposable identities: one admin, two members, and one PM. The member's external task/project IDs and all session material remain in protected fixture files under `/private/tmp/gitiempo-manual-qa-gscHOc/` and are intentionally not recorded here.

## Approval-review note

The automatic approval review initially rejected the confirmation click because it was an irreversible time-entry deletion, although it recognized the entry as test data. The user subsequently explicitly authorized test-entry deletion and final QA cleanup. Root then completed the exact UI confirmation path in a fresh session. No deletion was attempted indirectly before that authorization.

Disposable QA database and all session/credential/helper files were removed after the root follow-up; only screenshots remain.

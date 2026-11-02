# Frontend QA evidence

## Automated verification

Run on 2026-10-13 after the final own-time tooltip and scoped-task-cache changes.

| Surface | Command | Result |
| --- | --- | --- |
| User SPA tests | `pnpm --filter user-web exec vitest run` | 51 files, 534 tests passed |
| User SPA lint | `pnpm --filter user-web lint` | passed with 11 pre-existing warnings and no errors |
| User SPA typecheck | `pnpm --filter user-web typecheck` | passed |
| User SPA production build | `pnpm --filter user-web build` | passed; existing Vite chunk-size warning only |
| Admin SPA tests | `pnpm --filter admin-web test` | 66 files, 555 tests passed |
| Admin SPA lint/typecheck/build | package commands | passed; lint retained two pre-existing `GithubCallback` warnings |
| Diff whitespace | `git diff --check` | passed |

The focused user tests cover the own-time external tag and capability-gated controls, hover/focus/click/Escape/outside/focus-exit hint dismissal, per-project tooltip IDs, and a populated project-scope task cache narrowing to own-time without rendering stale tasks.

## Browser QA against the isolated API

The browser checks used the temporary API at `http://localhost:3019` and local SPA previews at `http://localhost:5183` (user) and `http://localhost:5184` (admin). The fixtures were disposable QA accounts; no credentials, tokens, or request headers are recorded here.

### Project access (admin fixture)

- Existing **Admin Projects** view, desktop: the external `ITSUA-team/GiTiempo` project rendered its GitHub source and **External** tag. Screenshot: `/private/tmp/gitiempo-external-admin-desktop.png`.
- Same existing view at 390px mobile viewport: the responsive summaries and filters rendered. Screenshot: `/private/tmp/gitiempo-external-admin-mobile.png`. The external project card and its tag were below the captured viewport, so this screenshot does not prove the mobile card/tag state.
- Resource-path evidence for this page: `/projects` and `/projects/management-summary`.

### Own-time access (ordinary member fixture)

- Existing **Projects** view, desktop: `ITSUA-team/GiTiempo` rendered with the own-time `?` control, external task tags, GitHub issue links, and timer actions. No task-management add/edit controls were exposed. Screenshot: `/private/tmp/gitiempo-external-own-time-desktop.png`.
- The `?` control opened its explanation on click and closed it on Escape. Screenshot: `/private/tmp/gitiempo-external-own-time-tooltip.png`.
- A timer was started against the visible external task. The running state showed Stop on that task and disabled other starts. Screenshot: `/private/tmp/gitiempo-external-own-time-running.png`.
- The same timer was stopped. The task returned to Start and the other visible timer actions were enabled again. Screenshot: `/private/tmp/gitiempo-external-own-time-stopped.png`.
- Existing Projects view at 390px mobile viewport rendered the own-time project, external task links, and Start controls. Screenshot: `/private/tmp/gitiempo-external-own-time-mobile.png`.
- Resource-path evidence: `/projects`, `/projects/<external-project-id>/tasks`, `/time-entries/current`, and `/time-entries`.

### Project access in the user SPA (admin fixture)

- Existing **Projects** view, desktop: the same external project rendered its **External** task tags, timer actions, **Add task**, and per-task **Edit task** controls. Screenshot: `/private/tmp/gitiempo-external-project-scope-user-desktop.png`.
- At 390px mobile viewport, the same project rendered **Add task**, per-task **Edit task**, GitHub issue links, and timer actions. Screenshot: `/private/tmp/gitiempo-external-project-scope-user-mobile.png`.
- Resource-path evidence: `/projects` and `/projects/<external-project-id>/tasks`.

The actual capability boundary observed in the user SPA is therefore: own-time presents timer controls and the transient scope explanation without task-management actions; project scope presents the same task/timer context plus Add task and Edit task controls.

## Design parity and accessibility note

The implementation reuses the existing Projects and Admin Projects views; it adds no route or new view. External projects and tasks use the approved **External** tag, and own-time projects add the approved `?` hint in the existing project header.

PrimeVue's default tooltip trigger does not provide the required touch click, Escape, outside-pointer, and focus-exit dismissal behavior. The header therefore uses the existing PrimeVue `Button` as an accessible trigger plus a transient `role="tooltip"` hint. It opens on hover, focus, and click/touch; it closes on pointer exit, focus exit, Escape, and an outside pointer press. Each hint has an ID based on its project ID, so multiple project sections do not duplicate `aria-describedby` targets. This is the only PrimeVue-driven parity compromise; it preserves the approved information hierarchy and does not add a screen.

## Deliberate coverage gaps

- The available browser fixtures did not cover provider-managed/private/custom repository states, project-manager/assignment variants, or a second workspace.
- The captured admin-mobile viewport did not include the external project card/tag below the fold; mobile external-card visual confirmation remains a QA-evidence gap.
- The browser run did not delete or move the final own-time entry to observe a project disappearing, and did not exercise refocus or multi-tab synchronization. Cache narrowing and hidden-project cache removal are covered by regression tests rather than that live fixture.
- This evidence validates the accessible frontend paths available from the fixtures; it does not claim the full external-tracking acceptance matrix is browser-complete.

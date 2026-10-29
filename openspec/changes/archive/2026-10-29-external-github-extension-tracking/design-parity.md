# Design review and parity checklist

Revised 2026-10-14 following the user’s instruction: reuse current views, add `External` tags and contextual `?` help; do not create extra external-project/task views. Source: repository-root `GITiempo.pen`. [Current review PDF](design-review/export.pdf).

## Presentation decision

- Use current Projects, task rows/cards/dialogs, timer/manual-entry selectors, Dashboard/history and admin views. No external-only routes, pages, navigation sections, or parallel view components.
- Add the compact `External` tag to projects and tasks with server-owned external-reference policy. A GitHub source alone does not imply external policy.
- On an own-time project card/section, show `?` with: **You can only see your own time and tasks with your time entries.**
- Show the explanation on hover or keyboard focus; support tap/click on touch devices. Use an accessible name, visible focus, and Escape/outside dismissal.
- Show this explanation only for `accessScope: own-time`. Full-access admins/explicitly authorized members retain the tag and their normal scope, without a false personal-only message.
- Keep the current layout, filters, table/mobile-card branches and timer actions. Scope the data and hide unauthorized controls within these components. Do not add a permanent own-time introduction panel or dedicated picker.
- Per the user's 13 October clarification, Projects shows no tracked-duration totals for projects or tasks. Preserve task status and Updated; tracked time remains in the existing Time Entries view.

## Updated existing views

| Existing frame | Change |
| --- | --- |
| `yAu6B` — Projects List | Existing desktop page shows a managed section alongside an external `customer/billing-api` section. Project/task tags, visible task count, Updated, `?` and an open tooltip illustrate the restricted state. No tracked-duration totals. The managed section retains its normal controls. |
| `FRM1d` — Projects List Mobile — Timer States | Existing mobile project header/cards have External tags and a touch-sized `?` trigger. Task count, status and updated metadata replace the superseded time examples; shared Add task/edit controls are absent for this scope. Existing timer-state examples and navigation remain. |

The desktop screenshot shows the tooltip open for review; it is transient in the product. Search suggestions are closed in this example. Timer-state rows remain examples of the existing action states, not new product views. Existing picker `LKDTn`, task dialog `OtPxH`, history `R2FI0`, dashboard `obxTM`, admin Projects `6iAjf` and admin reports retain their layouts; future implementation applies scope/capabilities to them directly.

## Retained extension/privacy review states

These are states or disclosure drafts for existing surfaces, not new routes. The PDF begins with the two Projects views, followed by this order.

| Frame | Existing surface/state |
| --- | --- |
| `xkeDn` | Extension popup: ready |
| `bPI7N` | Extension popup: context loading |
| `iWQgl` | Extension popup: context error |
| `F5nKsg` | Extension popup: managed access denied, no fallback |
| `E65VJ` | Extension popup: workspace loading |
| `bTmp0` | Extension popup: running |
| `dGk0P` | Injected issue control: ready/loading/error/running |
| `Qt8zW` | Existing Projects issue pane: same injected states |
| `FX7lL` | Existing public privacy page: desktop disclosure excerpt |
| `Y5pPJQ` | Existing public privacy page: mobile disclosure excerpt |

Removed standalone web mockups: `NFZT3`, `uymXH`, `lw1w1`, `ULwkN`, `y3igB`, `b6jd4`, `qWbn1`, `G6Uwbz`. They are superseded and must not be implemented. Loading/error/empty/stale-selection behavior uses the current components and existing unavailable-route shell.

## Parity and behavior checklist

- [x] Existing Projects desktop/mobile hierarchy reused; no dedicated own-time page or picker.
- [x] External tag distinguishes policy; contextual help distinguishes personal access.
- [x] Only authorized own tasks/counts appear in own-time Projects; no project/task tracked-duration totals are displayed. Running entries grant visibility.
- [x] No peer members/counts or shared editing/creation controls for own-time scope; full project grants remain independent.
- [x] Existing timer actions and safe source links retained. No fake verification/synchronization claim.
- [x] One Start route, workspace context, context loading and denial states remain in existing extension surfaces.
- [x] Existing admin layouts retained; no enablement toggle. External projects remain private.
- [x] Updated desktop/mobile screenshots inspected for wrapping and layout; final traversal checked the retained review roots.
- [x] Runtime tooltip semantics, keyboard/focus/touch interaction, capability transitions and responsive behavior: combined executed evidence in [web QA](qa-web-final.md) and [extension QA](qa-extension-final.md).

## Evidence and save boundary

The initial grouped revision was saved in `GITiempo.pen` in commit `75cdb08d` (`Organize external tracking designs`). A fresh read-only Pencil inspection on 13 October confirmed Projects frames `yAu6B`/`FRM1d` inside `Z0XM0S`, including the External tags, own-time help and restricted controls. Both screenshots were inspected.

The user subsequently approved preserving the current popup UI and `docs/ui/chrome-ext.md`, and updating the existing Pen states to match them. The six popup roots `xkeDn`, `bPI7N`, `iWQgl`, `F5nKsg`, `E65VJ` and `bTmp0` are now updated and saved locally. They show the current branded header, global initial loading, centered context/managed errors with text Retry, workspace loading with disabled Start, and ready/running actions immediately below their content. Managed denial retains no fallback. The running Stop color matches the runtime destructive token. No new frames or views were added.

All six screenshots were inspected, and the final live traversal found no layout problems. The saved JSON roots were compared with the final live Pencil roots and matched exactly. Masking those six roots, the saved document equals HEAD, proving unrelated designs and grouping were preserved. The review PDF was refreshed from the live canvas. There is no pending save request.

The user approved reusing current views with tags/contextual help. Detailed implementation must follow this revised presentation; saving a file does not imply approval of unrelated design changes. No application code changed in this revision.

Privacy frames remain disclosure excerpts rather than a replacement published policy. Preserve unaffected sections and verify the real publication date and candidate package under task 8.2. Runtime accessibility and release readiness are not established by static screenshots.

## Projects duration decision — 13 October 2026

The user clarified that Projects must not display project/task tracked time,
because the existing Time Entries view serves that purpose. The prior duration
examples were design drift, not missing UI functionality. The desktop/mobile
Pencil frames now show task counts and Updated instead of completed-time totals
and per-task durations. No application code or aggregate API field was changed.
Both screenshots were inspected, with no layout problems, and the review PDF
was refreshed. The user confirmed manually saving these latest canvas changes
to the `.pen` file on 13 October. This is user-attested persistence; no pending
save request remains for this revision.

The preceding comparison also identified remaining project-header placement,
External badge styling, help-control size, table-header visibility and mobile
card differences. Those are not resolved by this duration-only decision and
are not claimed as full design parity. The earlier overall parity completion
claim is superseded by this focused audit.


## Projects implementation acceptance — 14 October 2026

The header/badge/help/table/mobile-card differences identified on 13 October are
now resolved in the existing `ProjectsTaskSection` renderer. Fresh Pencil reads
and browser checks confirm the scoped hierarchy, dimensions and responsive
behavior; Projects continues to omit all tracked durations. The source icon
required by UI documentation remains on mobile even though the static example
omits it. Existing shell/filter behavior and repository-standard icons remain
unchanged. No PrimeVue constraint forced a deviation.

See [final Projects parity evidence](qa-projects-parity-final.md) for measured
geometry, interactions, screenshots, full-scope/own-time regressions and cleanup.
This closes the focused audit and supersedes the preceding open-difference
statement; prior extension/admin/privacy evidence remains applicable.

# Design review and parity checklist

Revised 2026-10-13 following the user’s instruction: reuse current views, add `External` tags and contextual `?` help; do not create extra external-project/task views. Source: repository-root `GITiempo.pen`. [Current review PDF](design-review/export.pdf).

## Presentation decision

- Use current Projects, task rows/cards/dialogs, timer/manual-entry selectors, Dashboard/history and admin views. No external-only routes, pages, navigation sections, or parallel view components.
- Add the compact `External` tag to projects and tasks with server-owned external-reference policy. A GitHub source alone does not imply external policy.
- On an own-time project card/section, show `?` with: **You can only see your own time and tasks with your time entries.**
- Show the explanation on hover or keyboard focus; support tap/click on touch devices. Use an accessible name, visible focus, and Escape/outside dismissal.
- Show this explanation only for `accessScope: own-time`. Full-access admins/explicitly authorized members retain the tag and their normal scope, without a false personal-only message.
- Keep the current layout, filters, table/mobile-card branches and timer actions. Scope the data and hide unauthorized controls within these components. Do not add a permanent own-time introduction panel or dedicated picker.

## Updated existing views

| Existing frame | Change |
| --- | --- |
| `yAu6B` — Projects List | Existing desktop page now shows a managed section alongside an external `customer/billing-api` section. Project/task tags, own-time totals, `?` and an open tooltip illustrate the restricted state. The managed section retains its normal controls. |
| `FRM1d` — Projects List Mobile — Timer States | Existing mobile project header/cards have External tags and a touch-sized `?` trigger. Personal totals replace broad totals; shared Add task/edit controls are absent for this scope. Existing timer-state examples and navigation remain. |

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
- [x] Exact own tasks and personal totals only; running entries grant visibility but do not inflate completed totals.
- [x] No peer members/counts or shared editing/creation controls for own-time scope; full project grants remain independent.
- [x] Existing timer actions and safe source links retained. No fake verification/synchronization claim.
- [x] One Start route, workspace context, context loading and denial states remain in existing extension surfaces.
- [x] Existing admin layouts retained; no enablement toggle. External projects remain private.
- [x] Updated desktop/mobile screenshots inspected for wrapping and layout; final traversal checked the retained review roots.
- [ ] Runtime tooltip semantics, keyboard/focus/touch interaction, capability transitions and responsive behavior: implementation/QA work under sections 5–7/9.

## Evidence and save boundary

The revision was initially made through the live Pencil canvas and exported to the current PDF; the user chose to save the Pen file manually. The grouped design is now stored in `GITiempo.pen` in commit `75cdb08d` (`Organize external tracking designs`), and the file has no working-tree changes. A fresh read-only Pencil inspection on 13 October confirmed Projects frames `yAu6B`/`FRM1d` inside `Z0XM0S`, including the External tags, own-time help and restricted controls. Both screenshots were inspected. The PDF remains the review export; there is no pending save request for this revision.

The user approved reusing current views with tags/contextual help. Detailed implementation must follow this revised presentation; saving a file does not imply approval of unrelated design changes. No application code changed in this revision.

Privacy frames remain disclosure excerpts rather than a replacement published policy. Preserve unaffected sections and verify the real publication date and candidate package under task 8.2. Runtime accessibility and release readiness are not established by static screenshots.

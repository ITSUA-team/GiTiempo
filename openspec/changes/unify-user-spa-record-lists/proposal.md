# Proposal

## Why

User SPA record-list surfaces (Projects, Dashboard Recent Time Entries, and Time Entries) present the same kind of records with divergent visual treatment and interaction behavior, making the product feel inconsistent and forcing users to learn surface-specific rules. Issue [#516](https://github.com/ITSUA-team/GiTiempo/issues/516) requests unifying these surfaces using Time Entries as the reference, while keeping each surface's domain model intact (Projects edits tasks; Time Entries and Dashboard edit time entries).

## What Changes

- Hide column-heading strips on Projects and Dashboard Recent Time Entries through the existing page-level table option. Preserve project section headings, the Recent Time Entries section heading, the `View all` action, and mobile task card content.
- Match Dashboard desktop row height (52px), column widths (170/130/110px), rounding, spacing, typography, task/description composition, and active-entry treatment to Time Entries.
- Match Dashboard mobile layout to Time Entries: timer action before title, optional description under title, Project and Duration together, Range below. Preserve readable truncation and separate GitHub issue links.
- Retain entry description and the entry data needed by interactions in the Dashboard model using already-fetched data; no per-row requests or duplicate list fetches for presentation.
- Make Dashboard task-title interactions match Time Entries: completed entries open the existing entry-edit flow; the authoritative running entry opens the existing global timer picker. Reuse validation, permissions, save/delete behavior, and reconciliation so Dashboard rows and totals stay consistent after mutations.
- Match stop-first guidance on Dashboard to Time Entries when another task/workspace owns the timer. Preserve disabled pending/loading states, authoritative current-state/access checks, conflict handling, and protection against duplicate starts/stops.
- Align Projects row/card presentation where applicable: timer action before title on mobile and active-task highlight on desktop and mobile. Keep Task/Status/Updated metadata, External/own-time cues, capability-based task editing, and existing closed-task timer rules.
- Reuse small app-local row/card/content components or existing utilities when presentation and actions match. Keep day grouping/totals/create controls and task-specific orchestration in their owning views; avoid forcing Projects tasks into a time-entry model.
- Update Projects and Dashboard loading skeletons to match the headerless layouts and final row dimensions.
- Update approved Pencil frames, relevant UI documentation, and OpenSpec scenarios to describe the unified appearance and Dashboard interactions.

## Capabilities

### New Capabilities

None. This change unifies presentation and interaction behavior across existing User SPA surfaces; it does not introduce a new cohesive system behavior that needs its own capability.

### Modified Capabilities

- `user-pages`: Dashboard overview hides column headings and matches Time Entries desktop/mobile row dimensions, column widths, typography, description, and active-entry treatment; Dashboard recent-entry task-title interactions open the entry editor (completed) or global timer picker (running); Dashboard stop-first guidance matches Time Entries; Dashboard recent-entry mobile layout matches Time Entries; Dashboard loading skeletons match headerless layouts and final row dimensions; Time Entries is the reference presentation for record lists.
- `user-projects-list-page`: Projects task sections hide column headings while preserving section headings and mobile task card content; Projects task rows/cards place the timer action before the title on mobile; Projects highlights the active task row/card on desktop and mobile; Projects loading skeletons match headerless layouts and final row dimensions.

## Impact

- Layers: frontend only. Changes are confined to `apps/user-web` views, composables, and small reusable row/card/content components, plus `docs/ui/*` documentation and approved `.pen` frames.
- No backend, database, OpenAPI, shared API-contract, authentication-protocol, permission, or dependency change. Existing access checks and authoritative timer checks remain in force.
- No new API requests or duplicate list fetches are introduced for presentation; Dashboard uses already-fetched entry data.
- Projects still edits tasks; Time Entries and Dashboard edit time entries. The change does not force Projects tasks into a time-entry model.
- Success/info notification cleanup is tracked separately in [#513](https://github.com/ITSUA-team/GiTiempo/issues/513) and is out of scope.
- Planning only: implementation, browser acceptance, and changes to current main specs or other change directories are not performed by this proposal.

## Context

Issue #281 changes the Dashboard Recent Time Entries section from read-only activity display to a narrow direct-action surface. Current `user-pages` specs still reserve Dashboard timer control for the global top-bar timer and explicitly forbid page-local Dashboard stop controls, while `docs/ui/pages-user.md` now allows recent-entry row/card controls. This design reconciles that scope without introducing new backend endpoints or a separate Dashboard timer widget.

Affected code is limited to `apps/user-web` plus the app-local reusable time-entry timer action leaf. The nearest app guidance is `apps/user-web/AGENTS.md`: use Vue 3 `<script setup>`, PrimeVue controls for standard UI, follow `docs/ui/*`, preserve responsive record-list parity, and test both desktop and mobile branches when DOM differs.

## Goals / Non-Goals

**Goals:**

- Add icon-only `Start timer` / `Stop timer` controls to Dashboard Recent Time Entries rows and mobile cards.
- Reuse existing Time Entries direct-timer semantics: completed entries start a fresh timer for the same task, and the active running entry stops only after confirming it is still the authoritative current timer.
- Preserve Dashboard information hierarchy, row/card content, GitHub issue links, running-entry highlight, and `View all` action.
- Keep the global top-bar timer as the main timer surface and popup owner for freeform task selection.
- Keep the Dashboard client dependency narrow: own-entry reads plus timer lifecycle guard/mutations only, not full project/task management mutations.

**Non-Goals:**

- No backend API changes, migrations, seed data, or shared Zod contract updates.
- No new Dashboard timer panel, task picker, pause/resume support, or manual-entry form.
- No changes to admin-web, chrome extension, or shared theme tokens.
- No broad extraction of Dashboard recent-entry markup into shared packages.

## Decisions

1. **Reuse the existing direct-timer action pattern instead of inventing Dashboard-specific controls.**
   - Rationale: Time Entries already has accessible icon-only start/stop controls, disabled state, loading state, tooltip copy, and Heroicons/PrimeVue styling.
   - Alternative considered: create separate Dashboard buttons. Rejected because it would duplicate timer action accessibility and state behavior.

2. **Use the existing timer endpoints through the current user-web time-entry client.**
   - Rationale: `GET /time-entries/current`, `POST /time-entries/timer/start`, and `POST /time-entries/timer/stop` already model timer lifecycle and cache reconciliation.
   - Alternative considered: add a Dashboard-specific API endpoint. Rejected because no new backend behavior is needed.

3. **Guard stop actions against stale Dashboard rows.**
   - Rationale: Dashboard recent entries can be stale relative to the global timer. Before stopping, the action should refetch current timer state and only stop when the clicked row matches the authoritative running entry.
   - Alternative considered: call stop immediately from any highlighted row. Rejected because it risks stopping a different timer than the row the user clicked.

4. **Keep Dashboard controls scoped to recent-entry rows/cards.**
   - Rationale: This satisfies issue #281 while preserving the prior product rule that the global top bar owns the standalone timer surface and task-picker flow.
   - Alternative considered: add a broader Dashboard timer widget. Rejected as out of scope and contrary to the approved shell/timer direction.

5. **Revise the client-boundary regression requirement instead of removing it.**
   - Rationale: Dashboard now needs timer lifecycle methods, but it still should not depend on project/task mutation APIs such as `updateTask` or `deleteTask`.
   - Alternative considered: make Dashboard depend on the full `TimeEntriesClient`. Rejected because it weakens the regression safety the existing spec protects.

## Risks / Trade-offs

- **Stale running entry shown in Dashboard** → Mitigate by refetching current timer before stop and showing retryable feedback if the clicked row no longer matches.
- **Dashboard and Time Entries timer controls drift** → Mitigate by reusing a small timer action leaf and shared direct-timer action semantics.
- **Top-bar ownership ambiguity** → Mitigate by updating specs to distinguish row/card controls from a standalone Dashboard timer widget/panel.
- **More Dashboard client dependencies** → Mitigate with a narrow interface that includes only own-entry listing plus timer guard/start/stop operations.
- **Responsive parity regression** → Mitigate with tests that assert both desktop table and mobile-card branches render and emit the direct controls.

## Migration Plan

- Deploy as a frontend-only change; no database migration, backend deploy sequencing, or generated contract refresh is required.
- Rollback by removing Dashboard recent-entry control wiring and reverting the spec/docs delta; backend compatibility is unaffected.
- Verify with `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and focused/user-web Vitest coverage for Dashboard recent entries, Dashboard overview wiring, direct timer actions, and responsive branches.

## Open Questions

- None blocking. The change assumes issue #281 intentionally supersedes the prior Dashboard read-only timer-control wording for the Recent Time Entries section only.

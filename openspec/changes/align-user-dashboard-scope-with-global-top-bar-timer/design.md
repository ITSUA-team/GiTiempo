## Context

The authenticated user dashboard is currently blocked by a source-of-truth conflict. `docs/ui/pages-user.md`, `docs/ui/layout.md`, and the approved `GITiempo.pen` User Dashboard screen show the dashboard as an overview page while timer controls live in the global authenticated top bar. The existing `openspec/specs/user-pages/spec.md` still requires the dashboard page content to show a prominent active timer widget and stop action.

Affected frontend scope is `apps/user-web`, following `apps/user-web/AGENTS.md`: use the UI docs first, inspect the approved `.pen` screen, prefer PrimeVue components, and keep desktop parity with the approved design. Backend/API scope is informational only for this change because the existing time-entry endpoints already expose current timer and recent-entry data.

## Goals / Non-Goals

**Goals:**

- Align the `user-pages` spec with the approved global top-bar timer ownership model.
- Make the dashboard requirement testable as a dashboard overview page: header, loading skeleton, weekly focus insight, recent time entries, empty/error states, and optional stats cards.
- Explicitly prevent duplicate dashboard page-content timer controls from being reintroduced.
- Keep future implementation bounded to frontend dashboard view work and existing API/contract consumption.

**Non-Goals:**

- Do not change backend endpoint shapes or add dashboard aggregate endpoints in this change.
- Do not change the top-bar timer behavior except to reference it as the owner of timer controls.
- Do not implement the dashboard UI in this proposal change.
- Do not alter the approved `.pen` design or UI docs.

## Decisions

1. **Global top bar remains the sole timer-control owner.**
   - Rationale: The UI docs and approved design consistently put start/stop/task switching in the authenticated top bar on every user page.
   - Alternative considered: keep an additional dashboard timer widget. This was rejected because it duplicates control ownership and conflicts with `docs/ui/pages-user.md`.

2. **Dashboard spec describes overview content, not timer interaction controls.**
   - Rationale: The dashboard still benefits from activity context, but that should be represented through weekly focus, recent entries, loading/empty/error states, and optional stats surfaces.
   - Alternative considered: remove the dashboard requirement entirely. This was rejected because the page still has documented behavior and an approved design.

3. **No backend/API contract change for this alignment pass.**
   - Rationale: Existing endpoints provide current timer (`GET /time-entries/current`) and own entries (`GET /time-entries`) used by top-bar and dashboard surfaces. If implementation later proves that accurate weekly aggregation needs a new endpoint, that should be a separate scope/significant change.
   - Alternative considered: add a dashboard summary endpoint now. This was rejected because the present change is source-of-truth alignment, not an API expansion.

## Risks / Trade-offs

- **Risk:** Dashboard implementation may compute weekly focus from a limited paginated entry set and produce inaccurate summaries. → **Mitigation:** Tasks should require an explicit data strategy review during implementation and defer any new aggregate API to a separate proposal if needed.
- **Risk:** The approved `.pen` screen primarily shows a populated desktop state, while docs define loading and empty behavior. → **Mitigation:** Use shared loading, empty, and request-error patterns from UI docs when the design lacks a specific visual state.
- **Risk:** Existing tests or assumptions may still look for dashboard-local timer controls. → **Mitigation:** Update tests to assert top-bar ownership and absence of dashboard page-content timer controls.

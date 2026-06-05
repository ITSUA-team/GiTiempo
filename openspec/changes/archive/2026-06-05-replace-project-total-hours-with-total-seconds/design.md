## Context

GiTiempo stores time entry durations in `duration_seconds`. The current shared project response contract exposes `totalHours`, and the API derives that value by summing completed entry seconds through project tasks and dividing by 3600. Admin UI consumers then multiply the value back into seconds before displaying hours and minutes.

The project detail response already exposes `trackedSummary.totalSeconds`, so the list/base project response is the remaining place where the same aggregate is exposed in hours. The recent API docs update is already ahead of the implementation and documents `totalSeconds`, so the next implementation must realign contracts, API behavior, OpenAPI, and frontend consumers.

Affected guidance:
- Root `AGENTS.md`: backend/API/shared contract work follows API and shared-package source-of-truth rules.
- `apps/api/AGENTS.md`: backend changes must preserve NestJS, Drizzle, Zod contract, and OpenAPI conventions.
- `apps/admin-web/AGENTS.md`: admin UI changes must follow app-local frontend and design-system conventions.

## Goals / Non-Goals

**Goals:**
- Replace `totalHours` with `totalSeconds` in shared project response contracts.
- Return project totals as integer seconds from API project responses.
- Keep admin project table display and filters behavior-equivalent while consuming seconds.
- Regenerate OpenAPI and keep API documentation aligned.
- Update affected tests and fixtures so production contracts and consumers agree.

**Non-Goals:**
- Do not change stored database units; durations remain stored in seconds.
- Do not rename `trackedHoursWeek` or `trackedHoursMonth` summary fields in this change.
- Do not change project detail `trackedSummary.totalSeconds`; it remains the detail summary field.
- Do not introduce a compatibility alias returning both `totalHours` and `totalSeconds` unless a separate compatibility requirement is approved.

## Decisions

### Use seconds as the only base project response unit

The shared `ProjectResponse` shape will expose `totalSeconds` and remove `totalHours`.

Alternative considered: return both fields temporarily. This was rejected because no documented external-client compatibility requirement exists, both first-party frontends share the repository contracts, and keeping both fields would preserve the drift the change is meant to remove.

### Keep the aggregate source unchanged

`totalSeconds` will be derived from completed time entries linked through project tasks. Running entries without `duration_seconds` still do not contribute, and projects with no completed entries return zero.

Alternative considered: source list totals from the project detail summary path. This was rejected for the initial implementation because the existing list aggregate already computes the correct scope and only needs unit/name correction.

### Treat admin filtering thresholds as display-hour thresholds over seconds

The admin Projects page keeps the existing Hours filter labels: `Tracked`, `40h+`, and `No hours`. The `40h+` threshold compares against `40 * 3600` seconds, and display formatting receives seconds directly.

Alternative considered: rename the UI column or filters to seconds. This was rejected because the user-facing table remains an hours/minutes display; only the contract unit changes.

## Risks / Trade-offs

- [Breaking API contract] Existing clients reading `totalHours` will fail after the field is removed. → Mitigation: update shared contracts, first-party consumers, OpenAPI, docs, and fixtures in the same implementation change.
- [Precision drift in tests] Existing fixtures may encode fractional hours. → Mitigation: replace fixture values with exact integer second totals and assert formatted display output separately where needed.
- [Partial migration risk] A stray `totalHours` reference in frontend or API code would typecheck only if hidden behind loose fixture or `any` paths. → Mitigation: include repository search for production `totalHours` references outside archived OpenSpec history as an implementation verification step.

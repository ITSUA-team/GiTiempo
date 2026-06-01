## Context

The frontend currently has date/time logic in several feature-owned files. `apps/user-web/src/lib/time-formatters.ts` owns UTC time-entry helpers for dashboard, timer, projects, and time-entry displays, while `apps/admin-web/src/lib/report-view-model.ts` owns report-specific duration and local DatePicker boundary conversion. The backend also has repeated UTC calendar-boundary arithmetic in API services that calculate report defaults and project tracked-hour summary windows. These helpers cover behavior that is easy to drift: UTC day keys, UTC ISO week windows, UTC month defaults, local calendar date ranges converted to ISO API boundaries, compact duration labels, and running `HH:MM:SS` labels.

The frontend shared owner belongs in `packages/web-shared`, where `packages/web-shared/AGENTS.md` allows small shared browser/runtime helpers, and app rules require user/admin verification when shared frontend code changes. Backend date/time consolidation belongs in `apps/api` only; it must not move backend-safe contracts into frontend packages or import browser-only helpers into the API. UI docs define user-facing timer/time-entry labels and admin report date-range behavior; API specs define report default windows and project summary windows. Those labels and query semantics must remain stable.

`date-fns` should reduce hand-written date arithmetic, but it is not a blanket replacement for every helper. Core `date-fns` day helpers operate in local time unless an explicit timezone-aware option or companion package is used. The migration must keep UTC and local-calendar semantics visible in helper names and tests.

## Goals / Non-Goals

**Goals:**

- Create one shared frontend utility owner for reusable date/time primitives used by both SPAs or repeated frontend feature surfaces.
- Create one backend utility owner for repeated API UTC calendar-boundary primitives used by multiple backend services.
- Use `date-fns` for parsing, formatting, duration arithmetic, and calendar operations where its timezone semantics match the required behavior.
- Preserve existing user-visible labels: compact duration labels, running `HH:MM:SS`, `HH:mm` time ranges, `Today`/`Yesterday` day labels, and report duration labels.
- Preserve API query semantics: time-entry filters use the existing started-at boundaries, and admin reports keep DatePicker local calendar boundaries converted to ISO timestamps.
- Preserve backend API semantics: report omitted date filters default to the current UTC calendar month, and project tracked-hour summaries keep UTC ISO-week and UTC month starts.
- Keep domain display wrappers app-local when they encode page vocabulary such as `Running`, `Member scope`, or report grouping labels.
- Add focused tests at the shared utility boundary and affected app consumer boundaries.

**Non-Goals:**

- Changing backend timestamp storage, API request/response shapes, OpenAPI endpoint shapes, database schema, auth/permission behavior, or report/time-entry aggregation rules.
- Redesigning Dashboard, Time Entries, top-bar timer, Projects, or Reports UI.
- Moving route/view orchestration, query composables, or page-specific view models into `packages/web-shared`.
- Introducing cross-time-zone user preferences or replacing the persisted workspace time-zone settings model.
- Adding a broader date/time abstraction for hypothetical future locales beyond the current product labels.

## Decisions

### Shared utility ownership in `packages/web-shared`

Create a small browser-safe date/time utility module in `packages/web-shared`, for example under an explicit subpath such as `@gitiempo/web-shared/time`. This keeps repeated frontend runtime helpers out of `@gitiempo/shared`, which must remain backend-safe and contract-focused, and avoids app-local copies once both SPAs consume the same behavior.

Alternative considered: keep utilities in `apps/user-web/src/lib/time-formatters.ts` and import them from admin. That would invert app ownership and couple admin code to user-web internals, so it is rejected.

### Backend utility ownership in `apps/api`

Create a small backend-only date/time utility module under `apps/api`, for example `apps/api/src/common/time.ts`, for repeated UTC calendar-boundary helpers used by backend services. This keeps backend calendar semantics close to API code, avoids importing browser/runtime frontend helpers into NestJS services, and removes parallel local UTC arithmetic from report and project services.

Alternative considered: reuse `@gitiempo/web-shared/time` from the backend. That would violate package boundaries because `packages/web-shared` is browser/runtime frontend code and already carries frontend dependencies. It is rejected.

Alternative considered: move the helpers to `@gitiempo/shared`. That package should remain contract-focused and backend-safe, not become a runtime utility bucket. It is rejected unless a helper becomes part of an actual shared contract.

### Separate primitive helpers from domain wrappers

Shared utilities should expose reusable primitives such as UTC date keys, UTC day/week boundaries, local calendar day boundaries, elapsed duration labels, compact duration labels, and UTC time labels. App-local wrappers should remain for domain wording, such as formatting a time-entry range as `09:00 - Running` or deriving report table labels.

Alternative considered: move all time-entry and report formatting into one shared formatter. That would hide product-specific wording and increase coupling between unrelated user/admin surfaces, so it is rejected.

### Use `date-fns` where semantics are explicit

Use `date-fns` for operations where it improves clarity without changing behavior, such as adding days to local DatePicker values, formatting fixed patterns, clamping/rounding durations, and interval calculations. For UTC calendar boundaries, either use a clearly named shared UTC helper implemented with explicit UTC construction or a timezone-aware date-fns path if the chosen dependency supports UTC context in the installed version. Do not replace UTC helpers with local `startOfDay`/`startOfWeek` semantics.

Alternative considered: migrate every helper directly to `date-fns/startOfDay`, `startOfWeek`, and `format`. That risks local timezone drift for time-entry UTC filters and dashboard week windows, so it is rejected.

### Dependency placement and package boundaries

Add `date-fns` to the package that owns the shared frontend implementation, expected to be `packages/web-shared`. Consuming apps should import the shared helper API rather than depending on date-fns directly for repeated product date/time behavior. Direct app-level `date-fns` imports are acceptable only for one-off behavior that is not shared and not business-critical. Backend helper consolidation does not require adding `date-fns` to `apps/api`; explicit UTC `Date.UTC(...)` construction is acceptable where it keeps API semantics clearer and avoids a new backend dependency.

Alternative considered: add `date-fns` independently to each app. That would allow divergence to continue and make future rule changes harder, so it is rejected.

### Verification owns behavior, not implementation details

Tests should assert the current observable behavior and boundary semantics: UTC date keys around day boundaries, UTC ISO week start/end, UTC month defaults, local DatePicker report ranges, closed-open dateTo behavior, compact and elapsed duration strings, running timers, Dashboard aggregate labels, Time Entries grouping/filter query boundaries, Projects relative updated labels, Reports query/export conversion, backend report default windows, and backend project summary windows. Tests should not overfit to the internal date-fns function choices.

## Risks / Trade-offs

- UTC/local timezone regression -> Mitigate with shared utility tests that run against fixed ISO timestamps and local DatePicker examples, plus app consumer tests for affected queries and labels.
- Backend calendar-window regression -> Mitigate with focused backend tests for UTC ISO-week, UTC month, report default date windows, and project summary tracked-hour windows.
- Over-sharing page-specific wording -> Mitigate by sharing primitives only and keeping feature vocabulary wrappers local.
- Bundle/dependency impact -> Mitigate by importing named date-fns functions only and keeping the shared module browser-safe.
- Cross-app verification cost -> Mitigate by limiting the shared API surface and running both `user-web` and `admin-web` lint/typecheck/test checks required for touched frontend packages.
- DST edge cases in local report ranges -> Mitigate by preserving local calendar-day boundary conversion behavior and testing ranges through dates that are sensitive to local offset changes where practical.

## Migration Plan

1. Add `date-fns` to the shared frontend utility owner and create shared date/time helpers with focused tests.
2. Migrate `user-web` time-entry, dashboard, timer, projects, and filter helpers to shared primitives while preserving app-local domain wrappers.
3. Migrate `admin-web` report view-model duration and date-boundary helpers to shared primitives while preserving report-specific labels and validation flow.
4. Add the backend UTC calendar-boundary utility owner and migrate repeated API service helper logic while preserving report and project summary behavior.
5. Run affected shared, app, and API tests, then run lint/typecheck for both web apps and the API because `packages/web-shared` and `apps/api` change.
6. Rollback is code-only: revert consumers to previous local helpers and remove the shared frontend utility/dependency and backend utility module if a behavioral regression is found before release.

## Open Questions

- None. The implementation can proceed with the explicit rule that UTC and local DatePicker semantics must remain separate and covered by tests.

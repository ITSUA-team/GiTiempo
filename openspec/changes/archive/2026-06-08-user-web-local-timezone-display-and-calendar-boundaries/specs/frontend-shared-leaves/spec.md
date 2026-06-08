## MODIFIED Requirements

### Requirement: Shared Frontend Date-Time Leaves Preserve Time Tracking Semantics

The frontend codebase SHALL centralize repeated browser-safe date, time, calendar-boundary, and duration helper logic in a shared frontend leaf when the behavior is used by both SPAs or by multiple time-tracking/reporting surfaces, while preserving the source-of-truth timezone semantics of each consuming surface.

#### Scenario: Repeated date-time helpers use one shared owner

- **WHEN** `user-web` and `admin-web`, or multiple feature surfaces within those apps, need the same date key, time label, duration label, elapsed timer label, or calendar-boundary behavior
- **THEN** those surfaces SHALL consume one shared frontend helper implementation instead of maintaining parallel local helper logic
- **AND** app-local code SHALL keep only domain-specific wrapper wording or feature composition that is not shared behavior

#### Scenario: User-web member-facing time-entry boundaries use browser-local timezone

- **WHEN** user-web member-facing time-entry displays, filters, dashboard windows, grouped day labels, profile timestamp labels, or projects updated metadata are derived from stored ISO timestamps
- **THEN** those surfaces SHALL use browser-local timestamp formatting and browser-local calendar boundaries
- **AND** the shared helper layer SHALL NOT force those member-facing user-web semantics to remain UTC-based

#### Scenario: Admin report ranges remain local-calendar based

- **WHEN** admin report setup converts a PrimeVue DatePicker date range into report API `dateFrom` and `dateTo` query timestamps
- **THEN** the selected local calendar days SHALL still map to local day-start and next-local-day-start ISO boundaries
- **AND** the report query SHALL preserve the existing closed-open date window semantics

#### Scenario: Duration and running timer labels stay stable

- **WHEN** frontend surfaces render compact durations, report durations, completed time-entry durations, or running timer elapsed labels
- **THEN** the user-visible label formats SHALL remain consistent with existing product behavior
- **AND** running elapsed labels SHALL continue to clamp negative elapsed seconds to zero before rendering `HH:MM:SS`

#### Scenario: Shared date-time helpers are frontend leaves only

- **WHEN** the shared date-time utility module is introduced or extended
- **THEN** it SHALL live in a browser-safe frontend package such as `@gitiempo/web-shared`
- **AND** it SHALL NOT move API contracts, backend persistence rules, route/view orchestration, query composables, or page-specific report/time-entry view models into the shared utility boundary

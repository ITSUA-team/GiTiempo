## ADDED Requirements

### Requirement: Shared formatHours Utility

The `packages/web-shared` package MUST export a `formatHours` pure function that converts a decimal hours value to a human-readable string.

The function SHALL produce output in the form `Xh` when minutes round to zero, or `Xh Ym` when non-zero minutes are present. Zero hours SHALL produce `0h`.

#### Scenario: Zero hours

- **WHEN** `formatHours(0)` is called
- **THEN** it returns `"0h"`

#### Scenario: Whole hours only

- **WHEN** `formatHours(3)` is called
- **THEN** it returns `"3h"`

#### Scenario: Hours and minutes

- **WHEN** `formatHours(1.5)` is called
- **THEN** it returns `"1h 30m"`

#### Scenario: Minutes round to zero

- **WHEN** `formatHours(2.004)` is called
- **THEN** it returns `"2h"` (minutes round to 0)

#### Scenario: Consumed by both SPAs

- **WHEN** `apps/admin-web` renders project hours in `ProjectsTable`
- **THEN** it imports `formatHours` from `@gitiempo/web-shared`
- **AND** does not define its own local copy of the function

#### Scenario: Consumed by user-web composable

- **WHEN** `apps/user-web` renders project total hours in `ProjectHeader`
- **THEN** `useProjectFormatters` delegates to the shared `formatHours` from `@gitiempo/web-shared`
- **AND** does not define its own local copy of the function

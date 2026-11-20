# Spec Delta

## ADDED Requirements

### Requirement: Time Entries Route URL Filter Query Parameters

The Time Entries route SHALL accept validated URL query parameters for date range, project identity, task identity, and pagination, and SHALL hydrate filter state from them before the first list request.

#### Scenario: Time Entries route accepts filter query parameters

- **WHEN** the Time Entries route is navigated to with query parameters `dateFrom`, `dateTo`, `projectId`, `taskId`, and `page`
- **THEN** the route accepts these parameters as filter state
- **AND** `dateFrom` and `dateTo` are interpreted as ISO timestamps with inclusive start and exclusive end boundaries
- **AND** `projectId` and `taskId` are interpreted as UUID resource identifiers
- **AND** `page` is interpreted as a positive integer defaulting to 1

#### Scenario: Time Entries route validates query parameters

- **WHEN** the Time Entries route receives query parameters
- **THEN** non-UUID `projectId` or `taskId` values are discarded
- **AND** non-positive or non-integer `page` values are clamped to 1
- **AND** `dateTo` earlier than `dateFrom` is discarded or clamped
- **AND** valid parameters in the same request are applied regardless of invalid ones

#### Scenario: Time Entries route updates URL when filters change

- **WHEN** the user changes a filter control on the Time Entries page
- **THEN** the URL query parameters update to reflect the new filter state
- **AND** the update uses `replaceState` for control-driven changes to avoid polluting browser history with every keystroke
- **AND** pagination changes update the `page` query parameter

#### Scenario: Time Entries route restores filters from history

- **WHEN** the user navigates to the Time Entries route via Back or Forward browser navigation
- **THEN** the route restores filter state from the URL query parameters at that history entry
- **AND** visible controls and list data reflect the restored filters
- **AND** the restoration happens before any list request is made

### Requirement: Dashboard Focus Period URL State

The Dashboard route SHALL encode the selected Top Focus period in the URL and restore it from the URL on load and history navigation, defaulting to Week when absent.

#### Scenario: Dashboard route encodes focus period

- **WHEN** the user selects a Top Focus period (Day, Week, or Month)
- **THEN** the Dashboard route URL updates with a `focusPeriod` query parameter set to `day`, `week`, or `month`
- **AND** the update uses `replaceState` to avoid polluting browser history on period selection

#### Scenario: Dashboard route restores focus period from URL

- **GIVEN** the Dashboard route URL contains `focusPeriod=month`
- **WHEN** the Dashboard loads
- **THEN** the Top Focus section initializes with the Month period
- **AND** Top Focus values, heading, and description reflect the Month period

#### Scenario: Dashboard route defaults to Week when no focus period

- **WHEN** the Dashboard route URL has no `focusPeriod` query parameter or an invalid value
- **THEN** the Top Focus section defaults to the Week period
- **AND** the URL is updated to encode `focusPeriod=week`

#### Scenario: Dashboard focus period survives history navigation

- **GIVEN** the user selected Month as the focus period and navigated away from the Dashboard
- **WHEN** the user navigates Back to the Dashboard
- **THEN** the Top Focus period selector restores Month from the URL
- **AND** Top Focus values reflect the Month period

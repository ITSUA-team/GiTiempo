## ADDED Requirements

### Requirement: User Pages Use Browser-Local Timezone Semantics

Member-facing `user-web` pages SHALL use the authenticated user's current browser-local timezone for timestamp labels and calendar-boundary behavior unless a page requirement explicitly defines a different timezone source.

#### Scenario: Dashboard current-week and current-day windows are browser local

- **WHEN** Dashboard stats, weekly focus, or recent-entry labels derive `Today`, `This Week`, or entry time-range context from stored time-entry timestamps
- **THEN** the page uses the user's current browser-local calendar day and browser-local Monday-start week boundaries
- **AND** the page does not derive those user-facing windows from UTC day or UTC ISO-week boundaries

#### Scenario: Time Entries list groups and filters by browser-local calendar days

- **WHEN** the Time Entries page groups rows/cards by day or converts DatePicker day selections into `dateFrom` and `dateTo` query timestamps
- **THEN** it groups entries by the started-at day in the user's current browser-local timezone
- **AND** it converts selected calendar days into browser-local day-start and next-browser-local-day-start ISO boundaries before calling the API

#### Scenario: Day-level create presets use the selected local day

- **WHEN** the user opens the day-level `+ New time entry` action from a rendered day group
- **THEN** the create dialog presets `startedAt` and `endedAt` on that rendered browser-local calendar day
- **AND** it does not seed those presets by treating the selected day key as a UTC midnight boundary

#### Scenario: Profile GitHub timestamps render as local labels

- **WHEN** the Profile page renders `connectedAt` and `updatedAt` from the GitHub connection status contract
- **THEN** it formats those contract timestamps as user-facing labels in the authenticated user's current browser-local timezone
- **AND** it does not render the raw ISO strings directly in the connected account metadata view

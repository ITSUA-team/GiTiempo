# Spec Delta

## MODIFIED Requirements

### Requirement: User Dashboard Overview

The user dashboard SHALL provide an authenticated overview page with selectable Day/Week/Month Top Focus periods, navigable information cards, recent entries, optional summary stats, and direct timer actions scoped only to recent time-entry rows/cards, while relying on the global top-bar timer for the standalone timer surface and task-picker flow.

#### Scenario: Dashboard renders approved overview content

- **WHEN** the dashboard loads
- **THEN** the page shows Top Focus insight content and recent time-entry activity
- **AND** the page may include optional stats cards or panels when data is available
- **AND** the page does not render a standalone page-content timer widget or timer panel
- **AND** Dashboard timer controls, when present, are limited to direct actions on Recent Time Entries rows or cards

#### Scenario: Running timer ownership stays in global top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** the dashboard loads
- **THEN** the global top-bar timer remains the primary running timer surface
- **AND** the dashboard may provide a direct `Stop timer` action only on the Recent Time Entries row or card that represents the authoritative running entry
- **AND** the dashboard does not provide a separate timer widget, task-picker, pause/resume action, or standalone stop panel in page content

#### Scenario: Dashboard shows initial skeleton loading

- **WHEN** the dashboard data request is pending
- **THEN** the page renders the approved skeleton loading state for the overview surface

#### Scenario: Dashboard with no recent data

- **GIVEN** the user has no recent time entries or active timer
- **WHEN** the dashboard loads
- **THEN** the dashboard uses the shared empty-state pattern for the missing sections

#### Scenario: Dashboard request failure stays distinct

- **WHEN** the dashboard data request fails
- **THEN** the page renders the approved request-failure state for the overview surface
- **AND** the failure is surfaced without turning the page into a standalone timer-control surface

#### Scenario: Dashboard information cards are navigable

- **WHEN** the dashboard renders in the ready state
- **THEN** each information card (Today, This Week, Projects This Week, Top Focus section, Top Project, Top Task, Recent Time Entries) is a navigable link to the corresponding Time Entries scope
- **AND** the destination URL encodes validated filter state for the card's scope

#### Scenario: Dashboard Top Focus period defaults to Week

- **WHEN** the dashboard loads and no focus period is present in the URL
- **THEN** the Top Focus section defaults to the Week period
- **AND** Top Project, Top Task, tracked durations, entry counts, percentages, empty-state copy, and the heading reflect the Week period

### Requirement: Top-Bar Timer Changes Synchronize User Time Entry Lists

The user app SHALL synchronize visible Dashboard selected-period aggregate state, Dashboard recent-entry state, and Time Entries list state with successful global top-bar timer lifecycle changes without requiring a page refresh.

#### Scenario: Dashboard weekly aggregates update after top-bar timer start

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Dashboard Top Focus or stats depend on the selected-period entry set
- **WHEN** the top-bar timer start action succeeds and returns a running time entry that belongs in the selected-period dashboard query scope
- **THEN** the Dashboard Top Focus and stats SHALL update without a page refresh
- **AND** the updated values SHALL continue to derive from the same selected-period entry set semantics used by the Dashboard overview

#### Scenario: Dashboard weekly aggregates update after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Dashboard Top Focus or stats currently include the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the Dashboard Top Focus and stats SHALL update without a page refresh
- **AND** the updated values SHALL reflect the completed duration from the returned entry
- **AND** the Dashboard SHALL NOT require a full page reload to clear stale running-entry contribution from period aggregates

#### Scenario: Dashboard recent entries update after top-bar timer start

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the top-bar timer start action succeeds and returns a running time entry
- **WHEN** the returned entry belongs in the Dashboard recent-entry scope
- **THEN** the Recent Time Entries row or card for that entry SHALL appear or update without a page refresh
- **AND** it SHALL use the running-entry range, live duration, highlighted running/current visual state, and direct `Stop timer` action defined for Dashboard recent entries

#### Scenario: Dashboard recent entries update after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Recent Time Entries section includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching Dashboard row or card SHALL update without a page refresh
- **AND** it SHALL render the completed range and duration from the returned entry
- **AND** it SHALL no longer render running/current highlighting or live duration growth for that entry
- **AND** it SHALL render the completed-entry direct `Start timer` action for that entry's task when direct starts are otherwise available
- **AND** the recent-entry ordering SHALL continue to follow the backend list ordering semantics.

#### Scenario: Time Entries list updates after top-bar timer start

- **GIVEN** an authenticated user is viewing the Time Entries page
- **AND** the top-bar timer start action succeeds and returns a running time entry
- **WHEN** the returned entry belongs in the current Time Entries visible list scope
- **THEN** the grouped entry list SHALL appear or update without a page refresh
- **AND** any currently visible row or card with the same `id` SHALL be replaced by the returned entry
- **AND** a new row or card SHALL be inserted only when the returned entry matches the active filters and the current list scope is unpaged or on page 1
- **AND** later paginated pages SHALL NOT inject a new row or card for that started entry
- **AND** paginated visible scopes that gain the new entry locally SHALL update `total` and `totalPages` consistently with the visible list state
- **AND** the running entry row or card SHALL use the running-entry visual treatment
- **AND** edit and delete actions SHALL remain unavailable for that running entry.

#### Scenario: Time Entries list updates after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Time Entries page
- **AND** the visible list includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching grouped row or card SHALL update without a page refresh
- **AND** if the completed entry no longer matches the active filters, that visible row or card SHALL be removed from the current list scope
- **AND** paginated visible scopes that lose the entry locally SHALL update `total` and `totalPages` consistently with the visible list state
- **AND** filtered or paginated scopes that cannot be preserved safely through local reconciliation SHALL remain unchanged until the existing list reload path runs
- **AND** it SHALL render the completed range and duration from the returned entry
- **AND** running-entry highlighting and live duration growth SHALL stop for that entry
- **AND** edit and delete actions SHALL follow the existing completed-entry rules.

#### Scenario: Idle top-bar task selection does not create list state

- **GIVEN** no timer is running
- **WHEN** the user changes the selected task in the global top-bar timer
- **THEN** Dashboard recent entries and Time Entries SHALL NOT insert a synthetic row or card
- **AND** they SHALL NOT mark an entry as running/current solely because of idle task selection.

#### Scenario: Failed top-bar timer mutation leaves lists unchanged

- **GIVEN** the Dashboard or Time Entries page has visible time-entry list state
- **WHEN** a top-bar timer start or stop action fails
- **THEN** visible list state SHALL remain based on the previously loaded or reconciled entries.

### Requirement: User Pages Use Browser-Local Timezone Semantics

Member-facing `user-web` pages SHALL use the authenticated user's current browser-local timezone for timestamp labels and calendar-boundary behavior unless a page requirement explicitly defines a different timezone source.

#### Scenario: Dashboard current-week and current-day windows are browser local

- **WHEN** Dashboard stats, Top Focus, or recent-entry labels derive `Today`, `This Week`, `This Month`, or entry time-range context from stored time-entry timestamps
- **THEN** the page uses the user's current browser-local calendar day, browser-local Monday-start week, and browser-local calendar-month boundaries
- **AND** the page does not derive those user-facing windows from UTC day, UTC ISO-week, or UTC month boundaries

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

#### Scenario: Dashboard month period uses calendar-month arithmetic

- **WHEN** the Dashboard Top Focus period is set to Month
- **THEN** the period window starts at the first moment of the current browser-local calendar month
- **AND** the period window ends exclusively at the first moment of the next browser-local calendar month
- **AND** the boundary does not use a fixed-hour count or UTC month boundary

#### Scenario: Dashboard and Time Entries period boundaries match across DST

- **GIVEN** a DST transition occurs within the selected Day, Week, or Month period
- **WHEN** the Dashboard computes a period window and the corresponding Time Entries destination filter encodes that same window
- **THEN** both surfaces use identical browser-local calendar boundaries including the DST transition
- **AND** the destination filter does not shift by the DST offset relative to the Dashboard card's displayed value

## ADDED Requirements

### Requirement: Dashboard Card Navigation Destinations

Each Dashboard information card SHALL navigate to a specific Time Entries scope with validated URL filter state encoding the card's period, project, or task context.

#### Scenario: Today card navigates to current-day Time Entries

- **WHEN** the user activates the Today card
- **THEN** the app navigates to the Time Entries page with a URL encoding a single-day filter for the current browser-local calendar day
- **AND** the filter uses an inclusive start-of-day `dateFrom` and exclusive next-day-start `dateTo`
- **AND** the destination starts on page 1

#### Scenario: This Week card navigates to current-week Time Entries

- **WHEN** the user activates the This Week card
- **THEN** the app navigates to the Time Entries page with a URL encoding a Monday-start week filter for the current browser-local week
- **AND** the filter uses an inclusive week-start `dateFrom` and exclusive next-week-start `dateTo`
- **AND** the destination starts on page 1

#### Scenario: Projects This Week card navigates to week Time Entries without project filter

- **WHEN** the user activates the Projects This Week card
- **THEN** the app navigates to the Time Entries page with a URL encoding the current browser-local Monday-start week filter
- **AND** the destination does not apply a specific project filter
- **AND** the card label continues to count projects with tracked time, not all active projects
- **AND** the destination starts on page 1

#### Scenario: Top Focus section navigates to selected-period Time Entries

- **WHEN** the user activates the non-control area of the Top Focus section
- **THEN** the app navigates to the Time Entries page with a URL encoding the currently selected Day, Week, or Month period
- **AND** the destination starts on page 1

#### Scenario: Top Project card navigates to selected-period and winning-project Time Entries

- **GIVEN** the Top Focus section has a winning project for the selected period
- **WHEN** the user activates the Top Project card
- **THEN** the app navigates to the Time Entries page with a URL encoding the selected period and the exact winning project ID
- **AND** the destination does not rely on the project name or title as a filter constraint
- **AND** the destination starts on page 1

#### Scenario: Top Task card navigates to selected-period and winning-task Time Entries

- **GIVEN** the Top Focus section has a winning task for the selected period
- **WHEN** the user activates the Top Task card
- **THEN** the app navigates to the Time Entries page with a URL encoding the selected period and the exact winning task ID
- **AND** the destination does not rely on the task title as a search constraint
- **AND** the destination starts on page 1

#### Scenario: Recent Time Entries card navigates to unfiltered Time Entries

- **WHEN** the user activates the Recent Time Entries `View all` action or non-control card area
- **THEN** the app navigates to the Time Entries page without date, project, or task filters
- **AND** the destination starts on page 1

#### Scenario: Empty Top Project or Top Task navigates without entity filter

- **GIVEN** the Top Focus section has no tracked project or task for the selected period
- **WHEN** the user activates the empty Top Project or Top Task card
- **THEN** the app navigates to the Time Entries page with a URL encoding only the selected period
- **AND** the destination does not invent a project or task filter

#### Scenario: Card navigation replaces unrelated prior filters

- **GIVEN** the Time Entries page currently has active filters from a prior navigation or manual selection
- **WHEN** the user navigates from a Dashboard card to Time Entries
- **THEN** the destination URL replaces all prior date, project, task, and pagination filters with the card's scope
- **AND** prior unrelated filters are not preserved or merged

### Requirement: Dashboard Top Focus Period Selector

The Dashboard Top Focus section SHALL provide a Day/Week/Month period selector replacing the static period tag, defaulting to Week, that updates all Top Focus values and navigation filters without a page reload.

#### Scenario: Period selector renders with Day, Week, and Month options

- **WHEN** the Dashboard Top Focus section renders
- **THEN** a PrimeVue Select control is displayed in the section header offering Day, Week, and Month
- **AND** Week is selected when no period has been chosen or when the URL has no focus period parameter

#### Scenario: Selecting Day updates Top Focus to today

- **WHEN** the user selects Day in the period selector
- **THEN** the Top Focus heading and description update to reflect the Day period (e.g., "Top Focus Today")
- **AND** Top Project, Top Task, tracked durations, entry counts, percentages, and empty-state copy update to reflect only today's entries
- **AND** the URL updates to encode the Day focus period
- **AND** no page reload occurs

#### Scenario: Selecting Week updates Top Focus to current week

- **WHEN** the user selects Week in the period selector
- **THEN** the Top Focus heading and description update to reflect the Week period (e.g., "Top Focus This Week")
- **AND** Top Project, Top Task, tracked durations, entry counts, percentages, and empty-state copy update to reflect the current Monday-start week
- **AND** the URL updates to encode the Week focus period
- **AND** no page reload occurs

#### Scenario: Selecting Month updates Top Focus to current month

- **WHEN** the user selects Month in the period selector
- **THEN** the Top Focus heading and description update to reflect the Month period (e.g., "Top Focus This Month")
- **AND** Top Project, Top Task, tracked durations, entry counts, percentages, and empty-state copy update to reflect the current calendar month
- **AND** the URL updates to encode the Month focus period
- **AND** no page reload occurs

#### Scenario: Period selector is scoped to Top Focus only

- **WHEN** the user changes the Top Focus period selector
- **THEN** only the Top Focus section values update
- **AND** the Today, This Week, Projects This Week, and Recent Time Entries cards retain their own fixed scopes

#### Scenario: Period selector fetches all required pages before deriving winners

- **WHEN** a period is selected or changes
- **THEN** the app fetches every required page of entries for the selected period before deriving Top Project, Top Task, shares, and counts
- **AND** the app does not produce first-page-only aggregates
- **AND** the app reuses query and cache infrastructure to avoid duplicate requests

#### Scenario: Focus period survives browser history navigation

- **GIVEN** the user selected Month as the focus period and navigated to Time Entries from a Dashboard card
- **WHEN** the user navigates Back to the Dashboard
- **THEN** the Top Focus period selector restores Month
- **AND** Top Focus values reflect the Month period

### Requirement: Dashboard Card Navigation Accessibility and Nested Control Isolation

Dashboard card navigation SHALL be discoverable through hover and visible keyboard focus, use semantic links with accessible destination names, support new-tab opening, and keep nested controls independent from card navigation.

#### Scenario: Card navigation is keyboard accessible

- **WHEN** the user tabs to a navigable Dashboard card
- **THEN** the card shows a visible focus indicator
- **AND** pressing Enter or Space activates navigation to the card's destination

#### Scenario: Card navigation supports new-tab opening

- **WHEN** the user Ctrl+clicks, Cmd+clicks, or middle-clicks a navigable Dashboard card
- **THEN** the destination opens in a new browser tab
- **AND** the current tab's Dashboard state is not affected

#### Scenario: Nested timer controls do not trigger card navigation

- **GIVEN** a Dashboard card with navigation is rendered
- **AND** the card contains a Start timer or Stop timer action
- **WHEN** the user activates the Start timer or Stop timer action
- **THEN** the timer action executes
- **AND** card navigation is not triggered

#### Scenario: Nested entry editing does not trigger card navigation

- **GIVEN** a Dashboard Recent Time Entries card with navigation is rendered
- **AND** a row or card contains an edit action
- **WHEN** the user activates the edit action
- **THEN** the edit dialog opens
- **AND** card navigation is not triggered

#### Scenario: Nested GitHub issue link does not trigger card navigation

- **GIVEN** a Dashboard Top Task card with navigation is rendered
- **AND** the task has a GitHub issue link
- **WHEN** the user activates the GitHub issue link
- **THEN** the GitHub issue opens
- **AND** card navigation is not triggered

#### Scenario: Period selector does not trigger card navigation

- **GIVEN** the Top Focus section card with navigation is rendered
- **AND** the section header contains the period selector
- **WHEN** the user opens or changes the period selector
- **THEN** the period changes
- **AND** card navigation is not triggered

#### Scenario: Composite card avoids nested anchors

- **WHEN** a navigable Dashboard card renders with nested interactive controls
- **THEN** the card uses a single semantic link for the navigable area
- **AND** nested controls are not anchor elements inside the card's anchor
- **AND** activating a nested control does not produce ambiguous parent/child click targets

### Requirement: Consistent Drill-Down Time Semantics

Dashboard card displayed values and their Time Entries destination results SHALL use consistent selection and duration semantics so the destination explains the card's value, including entries crossing midnight, week/month boundaries, and running entries.

#### Scenario: Overnight entry contributes to both card and destination

- **GIVEN** a time entry starts before local midnight and ends after local midnight
- **WHEN** the Dashboard shows the Today card for the day the entry started
- **THEN** the Today card counts the entry's tracked time within that day
- **AND** navigating from the Today card to Time Entries shows the same entry
- **AND** the Time Entries destination explains the card's displayed value for that entry

#### Scenario: Week-boundary entry contributes to both card and destination

- **GIVEN** a time entry starts on Sunday and ends on Monday, crossing a Monday-start week boundary
- **WHEN** the Dashboard shows the This Week card
- **THEN** the card counts the entry's tracked time within the current week
- **AND** navigating from the This Week card to Time Entries shows the same entry
- **AND** the Time Entries destination filter boundary matches the Dashboard card's week boundary

#### Scenario: Month-boundary entry contributes to both card and destination

- **GIVEN** a time entry starts on the last day of a month and ends on the first day of the next month
- **WHEN** the Dashboard shows the Top Focus for the Month period
- **THEN** the Top Focus counts the entry's tracked time within the selected month
- **AND** navigating to Time Entries shows the same entry
- **AND** the Time Entries destination filter boundary matches the Dashboard card's month boundary

#### Scenario: Running entry contributes to both card and destination

- **GIVEN** a time entry is currently running and falls within the selected Dashboard period
- **WHEN** the Dashboard shows the card or Top Focus for that period
- **THEN** the displayed value includes the running entry's tracked time up to the current moment
- **AND** navigating to Time Entries shows the running entry
- **AND** the destination's filter range includes the running entry's start timestamp

#### Scenario: Destination filter uses startedAt selection consistent with card period

- **WHEN** a Dashboard card navigates to Time Entries
- **THEN** the destination filter encodes the same browser-local calendar boundaries as the Dashboard card's period
- **AND** the filter uses inclusive start and exclusive end boundaries matching the card's window
- **AND** a start-date-only link is not treated as exact reconciliation

### Requirement: Dashboard Period Change State Handling

Period changes in the Top Focus selector SHALL present loading, empty, and request-error states for the newly selected period without showing values from the previous period, and stale responses SHALL NOT replace a newer selection.

#### Scenario: Loading state during period change

- **GIVEN** the user changes the Top Focus period from Week to Month
- **WHEN** the Month data is being fetched
- **THEN** the Top Focus section shows a loading state
- **AND** values from the Week period are not displayed as Month values

#### Scenario: Empty state for new period

- **GIVEN** the user changes the Top Focus period to a period with no tracked entries
- **WHEN** the fetch completes with no entries
- **THEN** the Top Focus section shows the period-appropriate empty-state copy
- **AND** no previous-period values are shown

#### Scenario: Request error during period change

- **GIVEN** the user changes the Top Focus period
- **WHEN** the fetch for the new period fails
- **THEN** the Top Focus section shows a request-error state with a Retry action
- **AND** no previous-period values are shown as the new period's values

#### Scenario: Stale response does not replace newer selection

- **GIVEN** the user selects Day and then quickly selects Month before the Day fetch completes
- **WHEN** the Day fetch response arrives after the Month fetch has started
- **THEN** the Day response is discarded
- **AND** the Top Focus section shows Month data or its loading state, not Day data

### Requirement: Time Entries URL Filter Hydration and Synchronization

The Time Entries page SHALL hydrate filter state from validated URL query parameters before the first list request, keep visible controls synchronized with the URL, and restore filters on reload and Back/Forward navigation.

#### Scenario: Direct link with filters initializes before first request

- **GIVEN** a URL with valid `dateFrom`, `dateTo`, `projectId`, `taskId`, and `page` query parameters
- **WHEN** the Time Entries page loads from that URL
- **THEN** the page initializes all filters from the URL before making the first list request
- **AND** the first list request includes the URL-encoded filters
- **AND** no initial unfiltered request is sent before the filtered request

#### Scenario: Visible controls reflect URL state

- **GIVEN** the Time Entries page loaded from a URL with filter parameters
- **WHEN** the page renders
- **THEN** the date range picker, project autocomplete, task autocomplete, and paginator all reflect the URL-encoded values
- **AND** changing a visible control updates the URL

#### Scenario: Filters survive page reload

- **GIVEN** the user has set filters on the Time Entries page and the URL reflects them
- **WHEN** the user reloads the page
- **THEN** all filters are restored from the URL
- **AND** the list request uses the restored filters

#### Scenario: Back and Forward restore filter state

- **GIVEN** the user navigated from Time Entries with filters to another page and back
- **WHEN** the user clicks Back or Forward to return to Time Entries
- **THEN** the filters from the URL at that history entry are restored
- **AND** visible controls and list data reflect the restored filters

#### Scenario: Invalid URL parameters are handled gracefully

- **GIVEN** a URL with invalid filter parameters (e.g., non-UUID project ID, out-of-range page, reversed date range)
- **WHEN** the Time Entries page loads from that URL
- **THEN** invalid parameters are discarded or clamped to valid defaults
- **AND** the page does not crash or send an invalid API request
- **AND** valid parameters in the same URL are still applied

#### Scenario: Stable project and task IDs in URL

- **WHEN** the URL encodes a `projectId` or `taskId` filter
- **THEN** the URL uses the stable resource ID, not the project or task name
- **AND** display labels are resolved separately from the ID
- **AND** renaming a project or task does not break the URL

### Requirement: Time Entries Filter Revalidation on Access Changes

The Time Entries page SHALL revalidate filters when workspace or access scope changes or when a referenced resource disappears, without silently showing all records while retaining an invalid selected label.

#### Scenario: Workspace switch clears invalid filters

- **GIVEN** the Time Entries page has an active project filter for a project in workspace A
- **WHEN** the user switches to workspace B where that project does not exist
- **THEN** the project filter is cleared
- **AND** the task filter is cleared if the task's project is no longer visible
- **AND** the page does not show all records while retaining the invalid project label

#### Scenario: Disappearing resource clears invalid filter

- **GIVEN** the Time Entries page has an active task filter
- **AND** the referenced task is deleted or the user loses access
- **WHEN** the visible projects or tasks list updates and no longer includes the referenced task
- **THEN** the task filter is cleared
- **AND** the page does not display the stale task label as if the filter is still active

#### Scenario: URL filter for inaccessible resource is dropped

- **GIVEN** a direct link to Time Entries with a `projectId` for a project the user cannot access
- **WHEN** the page loads and the project is not in the visible projects list
- **THEN** the project filter is dropped
- **AND** the URL is updated to remove the invalid `projectId`
- **AND** other valid filters in the URL are preserved

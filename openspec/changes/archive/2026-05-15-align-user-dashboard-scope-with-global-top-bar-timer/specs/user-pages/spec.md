## MODIFIED Requirements

### Requirement: User Dashboard Overview
The user dashboard SHALL render an authenticated overview page for the user's recent time activity while leaving timer start, stop, and task-context selection controls in the global top-bar timer surface.

#### Scenario: Dashboard renders approved overview content
- **WHEN** the dashboard loads successfully
- **THEN** the page shows the dashboard header, weekly focus insight with `Top Project This Week` and `Top Task This Week`, recent time-entry activity for the latest 10 entries, and any approved summary stat surfaces
- **AND** the page content does not show separate timer start or stop controls

#### Scenario: Dashboard with running timer
- **GIVEN** the user has a running timer
- **WHEN** the dashboard loads
- **THEN** the running timer state and stop action are available through the authenticated global top-bar timer surface
- **AND** the dashboard page content remains focused on overview surfaces and recent time-entry activity

#### Scenario: Dashboard initial loading state
- **WHEN** the dashboard data is loading
- **THEN** the page uses a skeleton that approximates the dashboard header, weekly insight or stat surfaces, and recent entries table before rendering empty states

#### Scenario: Dashboard with no recent data
- **GIVEN** the user has no recent time entries
- **WHEN** the dashboard loads
- **THEN** the dashboard uses the shared empty-state pattern for the missing dashboard overview sections

#### Scenario: Dashboard request failure
- **WHEN** dashboard overview data fails to load
- **THEN** the failed surface renders a request-error state distinct from empty data messaging

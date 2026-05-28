## MODIFIED Requirements

### Requirement: User-Web Top-Bar Timer Center Region

The authenticated user-web shell MUST reserve the top-bar center region for the compact timer surface on tablet and desktop, and MUST render the approved mobile timer strip inside shell chrome below the mobile top row while preserving the shared shell pattern and keeping admin-web unaffected.

#### Scenario: User-web top bar shows compact timer center content

- **GIVEN** the authenticated user-web shell is rendered at tablet or desktop width
- **WHEN** the top bar is shown
- **THEN** the left side displays the product identity and workspace name
- **AND** the center region displays the compact top-bar timer surface
- **AND** the right side displays the header-owned identity/profile controls defined by the active shell requirements

#### Scenario: User-web mobile shell shows selected timer strip

- **GIVEN** the authenticated user-web shell is rendered below the mobile breakpoint
- **WHEN** the top bar is shown
- **THEN** the product identity and user identity controls remain in the mobile top row
- **AND** the timer renders as a full-width shell strip below that top row using the approved `GITiempo.pen` mobile timer design
- **AND** the timer Start or Stop action and Change task action remain reachable outside the top-right identity/avatar control area

#### Scenario: Mobile timer actions remain usable beside the right identity/profile region

- **GIVEN** the authenticated user-web shell is rendered below the mobile breakpoint
- **AND** the shell renders the top-right identity/avatar region
- **WHEN** the mobile timer strip is visible and the right identity/profile region occupies the top-right shell area
- **THEN** the timer Start or Stop action remains visible and actionable
- **AND** the Change task action remains visible and actionable
- **AND** this scenario does not require a profile menu overlay to exist

#### Scenario: Mobile timer remains compatible with separately specified profile menu overlay

- **GIVEN** active header or profile-menu requirements specify a header-owned profile menu overlay opened from the top-right identity/avatar trigger
- **AND** the authenticated user-web shell is rendered below the mobile breakpoint
- **WHEN** that profile menu overlay is open while the mobile timer strip is visible
- **THEN** the timer Start or Stop action remains visible and actionable
- **AND** the Change task action remains visible and actionable
- **AND** any overlap from the profile menu overlay is limited to non-critical task metadata
- **AND** this mobile timer requirement does not create a new profile menu owner or move profile/menu action ownership into the timer

#### Scenario: Admin-web top bar has no timer center content

- **GIVEN** the authenticated admin-web shell is rendered
- **WHEN** the top bar is shown
- **THEN** the shell does not render a compact timer surface
- **AND** the existing admin-web top-bar identity/profile controls remain available according to the active shell requirements

#### Scenario: Compact timer fits top-bar height

- **GIVEN** the user-web top bar uses the documented `h-16` shell height on tablet and desktop
- **WHEN** the compact timer renders in running, idle, loading, error, or disabled state
- **THEN** the timer surface remains compact enough to fit the top bar
- **AND** smaller tablet and desktop widths truncate task context text before removing the elapsed time value or timer action

#### Scenario: Mobile timer strip remains compatible with bottom navigation

- **GIVEN** the user-web shell is rendered below the mobile breakpoint
- **WHEN** the mobile timer strip and mobile bottom navigation are both visible
- **THEN** the timer strip remains attached to the top shell chrome
- **AND** the mobile bottom navigation remains visible and independently usable
- **AND** page content does not become the owner of timer start, stop, or task-switching controls

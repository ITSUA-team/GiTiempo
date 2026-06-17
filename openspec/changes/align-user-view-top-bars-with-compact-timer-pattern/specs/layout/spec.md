## MODIFIED Requirements

### Requirement: User-Web Top-Bar Timer Center Region

The authenticated user-web shell MUST reserve the top-bar center region for the compact timer surface on tablet and desktop, and MUST render the approved mobile timer strip inside shell chrome below the mobile top row while preserving the shared shell pattern and keeping admin-web unaffected. Shell chrome MUST expose timer actions only through the compact timer popup entry point, not as separate header-visible Start, Stop, or Change task buttons. This shell ownership rule does not forbid the documented Time Entries row/card `Start timer` and `Stop timer` actions for existing entries.

#### Scenario: User-web top bar shows compact timer center content

- GIVEN the authenticated user-web shell is rendered at tablet or desktop width
- WHEN the top bar is shown
- THEN the left side displays the product identity and workspace name
- AND the center region displays the compact two-line top-bar timer surface at content width
- AND the compact timer surface is aligned toward the right avatar/profile side rather than centered across the full header
- AND the right side displays an avatar-only user-web profile trigger without visible member-name text
- AND the top bar does not render separate visible timer Start, Stop, or Change task action buttons outside the timer popup flow

#### Scenario: User-web mobile shell shows selected timer strip

- GIVEN the authenticated user-web shell is rendered below the mobile breakpoint
- WHEN the top bar is shown
- THEN the product identity and avatar-only user identity controls remain in the mobile top row
- AND the timer renders as a full-width shell strip below that top row using the approved `GITiempo.pen` mobile timer design
- AND the strip exposes a single `Task & timer` popup opener on the left
- AND the strip shows compact task metadata and running or idle timer status to the right of that opener
- AND the strip does not render separate visible timer Start, Stop, or Change task action buttons outside the timer popup flow

#### Scenario: Mobile timer opener remains usable beside the right identity/profile region

- GIVEN the authenticated user-web shell is rendered below the mobile breakpoint
- AND the shell renders the top-right avatar/profile region
- WHEN the mobile timer strip is visible and the right identity/profile region occupies the top-right shell area
- THEN the `Task & timer` opener remains visible and actionable
- AND the running or idle timer status remains visible enough to identify the current timer state
- AND this scenario does not require a profile menu overlay to exist

#### Scenario: Mobile timer remains compatible with separately specified profile menu overlay

- GIVEN active header or profile-menu requirements specify a header-owned profile menu overlay opened from the top-right identity/avatar trigger
- AND the authenticated user-web shell is rendered below the mobile breakpoint
- WHEN that profile menu overlay is open while the mobile timer strip is visible
- THEN the `Task & timer` opener remains visible and actionable
- AND the running or idle timer status remains visible enough to identify the current timer state
- AND any overlap from the profile menu overlay is limited to non-critical task metadata
- AND this mobile timer requirement does not create a new profile menu owner or move profile/menu action ownership into the timer

#### Scenario: Admin-web top bar has no timer center content

- GIVEN the authenticated admin-web shell is rendered
- WHEN the top bar is shown
- THEN the shell does not render a compact timer surface
- AND the existing admin-web top-bar identity/profile controls remain available according to the active shell requirements

#### Scenario: Compact timer fits top-bar height

- GIVEN the user-web top bar uses the documented `h-16` shell height on tablet and desktop
- WHEN the compact timer renders in running, idle, loading, error, or disabled state
- THEN the timer surface remains compact enough to fit the top bar
- AND smaller tablet and desktop widths truncate task context text before removing the elapsed time value or popup entry affordance

#### Scenario: Mobile timer strip remains compatible with bottom navigation

- GIVEN the user-web shell is rendered below the mobile breakpoint
- WHEN the mobile timer strip and mobile bottom navigation are both visible
- THEN the timer strip remains attached to the top shell chrome
- AND the mobile bottom navigation remains visible and independently usable
- AND page content does not become the owner of timer start, stop, or task-switching controls outside the documented Time Entries row/card actions for existing entries

### Requirement: Top-Bar Profile Dropdown Menu

The authenticated user-web and admin-web shells SHALL expose profile actions through a dropdown menu anchored to the top-bar profile/avatar trigger, while allowing app-specific closed-trigger identity text visibility.

#### Scenario: User-web profile menu opens from header identity trigger

- **GIVEN** an authenticated user-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** the closed and open user-web profile trigger remain avatar-only without visible display-name or member-name text
- **AND** the menu contains `Admin workspace`, `Profile`, and `Sign out` actions in that order
- **AND** the shell navigation does not render a duplicate `Profile` item
- **AND** the `Profile` action uses the same profile icon family as the user-web profile navigation item
- **AND** the existing user-web compact top-bar timer remains visible
- **AND** the user Profile page does not render a duplicate page-content `Sign out` action

#### Scenario: Admin-web profile menu opens from header identity trigger

- **GIVEN** an authenticated admin-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** the menu contains `User workspace`, `Settings`, and `Sign out` actions in that order
- **AND** the shell navigation does not render a duplicate `Settings` item
- **AND** the `Settings` action keeps the settings gear icon
- **AND** the admin profile trigger identity text remains visible, including the current admin scope label when the shell renders one, such as `PM scope: Project Orion`

#### Scenario: Profile menu exposes counterpart workspace switch

- **GIVEN** an authenticated shell is rendered
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** the dropdown includes the counterpart workspace action above the app-owned profile/settings action
- **AND** user-web labels that action `Admin workspace`
- **AND** admin-web labels that action `User workspace`
- **AND** the action uses the configured counterpart workspace href
- **AND** the shell does not render a standalone top-bar counterpart workspace text link
- **AND** the app-owned profile/settings action and `Sign out` action remain available in the same dropdown

#### Scenario: Profile/settings action navigates to app-owned settings surface

- **GIVEN** the profile dropdown menu is open
- **WHEN** the user activates the app-owned profile/settings action
- **THEN** user-web navigates to its existing profile/settings surface
- **AND** admin-web navigates to its existing settings surface
- **AND** the navigation uses the authenticated route tree rather than a public entry page

#### Scenario: Sign out action uses existing logout behavior

- **GIVEN** the profile dropdown menu is open
- **WHEN** the user activates `Sign out`
- **THEN** the current SPA starts its existing logout flow
- **AND** local session cleanup and guest-route behavior remain governed by the existing auth requirements for that SPA
- **AND** the user is redirected to that SPA's login route after logout cleanup completes

#### Scenario: Profile menu remains keyboard accessible

- **GIVEN** focus is on the top-bar profile/avatar trigger
- **WHEN** the user opens the menu with keyboard input
- **THEN** focus can move through the counterpart workspace action, app-owned profile/settings action, and `Sign out`
- **AND** activating a focused item performs the same action as clicking it
- **AND** dismissing the menu returns focus to the profile/avatar trigger

#### Scenario: Profile menu remains available on narrow layouts

- **GIVEN** the authenticated shell is rendered below desktop width
- **WHEN** optional top-bar identity text is hidden for space or by app-specific configuration
- **THEN** the avatar/profile trigger remains available
- **AND** activating it still opens the same app-owned profile/settings action and `Sign out` menu

## MODIFIED Requirements

### Requirement: Top-Bar Profile Dropdown Menu

The authenticated user-web and admin-web shells SHALL expose profile actions through a dropdown menu anchored to the top-bar profile/avatar trigger, while allowing app-specific closed-trigger identity text visibility and active-workspace switching for users with more than one workspace membership.

#### Scenario: User-web profile menu opens from header identity trigger

- **GIVEN** an authenticated user-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** when more than one workspace membership is available, the menu lists workspace-switching actions before app-to-app navigation actions
- **AND** the menu keeps the app-to-app `Admin workspace` action separate from workspace-switching actions
- **AND** the menu includes `Profile` and `Sign out` actions after workspace and app-navigation actions
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
- **AND** when more than one workspace membership is available, the menu lists workspace-switching actions before app-to-app navigation actions
- **AND** the menu keeps the app-to-app `User workspace` action separate from workspace-switching actions
- **AND** the menu includes `Settings` and `Sign out` actions after workspace and app-navigation actions
- **AND** the shell navigation does not render a duplicate `Settings` item
- **AND** the `Settings` action keeps the settings gear icon
- **AND** the admin profile trigger identity text remains visible, including the current admin scope label when the shell renders one, such as `PM scope: Project Orion`

#### Scenario: Profile menu exposes workspace switcher only for multiple memberships

- **GIVEN** an authenticated shell has loaded the user's available workspace memberships
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** the dropdown includes a workspace-switching section only when at least two memberships are available
- **AND** the current workspace is identified in that section
- **AND** selecting another workspace starts the active-workspace switch flow
- **AND** selecting the current workspace does not navigate to the counterpart app

#### Scenario: Profile menu exposes counterpart app navigation separately

- **GIVEN** an authenticated shell is rendered
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** user-web labels the counterpart app action `Admin workspace`
- **AND** admin-web labels the counterpart app action `User workspace`
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
- **THEN** focus can move through workspace-switching actions, the counterpart app action, app-owned profile/settings action, and `Sign out`
- **AND** activating a focused item performs the same action as clicking it
- **AND** dismissing the menu returns focus to the profile/avatar trigger

#### Scenario: Profile menu remains available on narrow layouts

- **GIVEN** the authenticated shell is rendered below desktop width
- **WHEN** optional top-bar identity text is hidden for space or by app-specific configuration
- **THEN** the avatar/profile trigger remains available
- **AND** activating it still opens the same workspace-switching actions, app-owned profile/settings action, and `Sign out` menu

## ADDED Requirements

### Requirement: Standalone Forbidden Routes Can Open Workspace Switching

Standalone authenticated 403 routes SHALL expose workspace switching only when another workspace membership is available and SHALL NOT reuse counterpart-app navigation as the switch action.

#### Scenario: Forbidden page offers workspace switching

- **GIVEN** an authenticated user reaches a standalone 403 route
- **AND** the user has another workspace membership available
- **WHEN** the 403 page renders
- **THEN** the page offers `Switch workspace` as a secondary action
- **AND** activating the action opens or navigates to the active-workspace switch flow for the current session

#### Scenario: Forbidden page omits switch action without another membership

- **GIVEN** an authenticated user reaches a standalone 403 route
- **AND** the user has no other workspace membership available
- **WHEN** the 403 page renders
- **THEN** the page omits the `Switch workspace` action
- **AND** the primary dashboard recovery action remains available

#### Scenario: Forbidden switch action is not counterpart app navigation

- **GIVEN** an authenticated user reaches a standalone 403 route
- **WHEN** the page renders `Switch workspace`
- **THEN** that action does not link directly to `user-web` or `admin-web` counterpart navigation
- **AND** the action uses the authenticated workspace-switching flow

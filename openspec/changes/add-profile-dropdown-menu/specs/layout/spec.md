## ADDED Requirements

### Requirement: Top-Bar Profile Dropdown Menu

The authenticated user-web and admin-web shells SHALL expose profile actions through a dropdown menu anchored to the top-bar profile/avatar trigger.

#### Scenario: User-web profile menu opens from header identity trigger

- **GIVEN** an authenticated user-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the dropdown remains pinned to the sticky header so it stays visible with the header while the page scrolls
- **AND** the dropdown includes a small caret/pointer aligned to the profile avatar circle
- **AND** the profile/avatar trigger shows the rounded border active state only while the dropdown is open
- **AND** the menu contains `Admin workspace`, `Profile`, and `Sign out` actions in that order
- **AND** the shell navigation does not render a duplicate `Profile` item
- **AND** the `Profile` action uses the same profile icon family as the user-web profile navigation item
- **AND** the existing user-web top-bar timer remains visible
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
- **AND** the existing admin-web workspace/scope identity remains visible

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
- **WHEN** optional top-bar identity text is hidden for space
- **THEN** the avatar/profile trigger remains available
- **AND** activating it still opens the same app-owned profile/settings action and `Sign out` menu

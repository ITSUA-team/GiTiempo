## ADDED Requirements

### Requirement: Top-Bar Profile Dropdown Menu

The authenticated user-web and admin-web shells SHALL expose profile actions through a dropdown menu anchored to the top-bar profile/avatar trigger.

#### Scenario: User-web profile menu opens from header identity trigger

- **GIVEN** an authenticated user-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the menu contains `Settings` and `Sign out` actions in that order
- **AND** the existing user-web top-bar timer and counterpart admin workspace link remain visible

#### Scenario: Admin-web profile menu opens from header identity trigger

- **GIVEN** an authenticated admin-web page is rendered with the shared shell
- **WHEN** the user activates the top-bar profile/avatar trigger
- **THEN** a dropdown menu opens below the trigger and aligned with the top-right identity area
- **AND** the dropdown has a visible spacing gap from the profile/avatar trigger
- **AND** the menu contains `Settings` and `Sign out` actions in that order
- **AND** the existing admin-web workspace/scope identity and counterpart user workspace link remain visible

#### Scenario: Settings action navigates to app settings surface

- **GIVEN** the profile dropdown menu is open
- **WHEN** the user activates `Settings`
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
- **THEN** focus can move through `Settings` and `Sign out`
- **AND** activating a focused item performs the same action as clicking it
- **AND** dismissing the menu returns focus to the profile/avatar trigger

#### Scenario: Profile menu remains available on narrow layouts

- **GIVEN** the authenticated shell is rendered below desktop width
- **WHEN** optional top-bar identity text is hidden for space
- **THEN** the avatar/profile trigger remains available
- **AND** activating it still opens the same `Settings` and `Sign out` menu

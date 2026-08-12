## ADDED Requirements

### Requirement: Top-Bar Profile Trigger Renders Member Avatar Image

The authenticated `user-web` and `admin-web` shells SHALL render the member's stored avatar image inside the existing top-bar profile trigger when one is available, and SHALL fall back to member initials otherwise. This governs only what is rendered inside the trigger; the trigger's sizing, open-state styling, and dropdown behaviour remain as specified by the profile dropdown menu requirement.

#### Scenario: Trigger shows the stored avatar image

- **GIVEN** an authenticated shell whose current user has a stored avatar
- **WHEN** the top bar renders
- **THEN** the profile trigger displays that avatar image within the existing circular trigger
- **AND** the image is cropped to the circle without distorting a non-square source
- **AND** member initials are not displayed alongside the image

#### Scenario: Trigger falls back to initials without an avatar

- **GIVEN** an authenticated shell whose current user has no stored avatar
- **WHEN** the top bar renders
- **THEN** the profile trigger displays the member initials as before

#### Scenario: Trigger falls back to initials when the avatar image fails to load

- **GIVEN** an authenticated shell rendering a stored avatar image
- **WHEN** the image fails to load
- **THEN** the profile trigger displays the member initials instead
- **AND** no broken image is shown

#### Scenario: Avatar rendering does not change trigger interaction

- **GIVEN** a profile trigger rendering an avatar image
- **WHEN** the user activates the trigger
- **THEN** the same profile dropdown opens with the same actions
- **AND** the open-state trigger styling is unchanged

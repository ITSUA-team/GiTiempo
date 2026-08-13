## ADDED Requirements

### Requirement: Profile Account Card Renders Member Avatar

The `user-web` Profile page account card SHALL render the member's stored avatar image when one is available and SHALL fall back to member initials otherwise. This applies to the member's own avatar and is distinct from the Profile GitHub connection card, which renders the connected GitHub account avatar under its own rules.

#### Scenario: Account card shows the stored avatar image

- **GIVEN** an authenticated member with a stored avatar opens the Profile page
- **WHEN** the account card renders
- **THEN** the card displays that avatar image in the existing circular avatar slot
- **AND** the image is cropped to the circle without distorting a non-square source
- **AND** member initials are not displayed alongside the image

#### Scenario: Account card falls back to initials without an avatar

- **GIVEN** an authenticated member with no stored avatar opens the Profile page
- **WHEN** the account card renders
- **THEN** the card displays the member initials as before

#### Scenario: Account card falls back to initials when the avatar image fails to load

- **GIVEN** the Profile account card rendering a stored avatar image
- **WHEN** the image fails to load
- **THEN** the card displays the member initials instead
- **AND** no broken image is shown

#### Scenario: Member avatar is independent of the GitHub connection avatar

- **GIVEN** a member whose GitHub connection reports an account avatar
- **WHEN** the Profile page renders
- **THEN** the account card avatar reflects the member's stored avatar only
- **AND** the GitHub connection card continues to render the connected GitHub account avatar under its existing rules

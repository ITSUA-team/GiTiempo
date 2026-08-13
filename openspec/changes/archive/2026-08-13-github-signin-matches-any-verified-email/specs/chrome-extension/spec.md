## MODIFIED Requirements

### Requirement: Popup Offers GitHub Sign-In When Enabled For The Build
The extension popup SHALL offer a GitHub sign-in action in its unauthenticated state when GitHub sign-in is enabled for the build, SHALL omit that action otherwise, and SHALL follow the approved popup authorization design for how the available sign-in actions are presented. Its recoverable sign-in copy SHALL name the no-member and ambiguous-account causes it can distinguish.

#### Scenario: GitHub action appears alongside the existing actions
- **GIVEN** GitHub sign-in is enabled for the extension build
- **AND** no valid extension session is available
- **WHEN** the user opens the extension popup
- **THEN** the unauthenticated state offers a GitHub sign-in action together with the Google and email actions
- **AND** the arrangement follows the approved popup authorization design

#### Scenario: GitHub action is hidden when not enabled
- **GIVEN** GitHub sign-in is not enabled for the extension build
- **WHEN** the user opens the extension popup unauthenticated
- **THEN** no GitHub sign-in action is shown
- **AND** the Google and email actions are unaffected

#### Scenario: Returned error indicator becomes recoverable copy
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns to the extension carrying an error indicator instead of a handoff code
- **THEN** the popup shows recoverable sign-in error copy naming the failure it can distinguish
- **AND** no session is stored
- **AND** the user can retry sign-in from the same state

#### Scenario: No-member indicator names the missing work address
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns the no-member error indicator
- **THEN** the popup explains that no GiTiempo account matches any verified email on the GitHub account
- **AND** it names `https://github.com/settings/emails` as where to add and verify a work address
- **AND** no session is stored

#### Scenario: Ambiguous-account indicator directs to email sign-in
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns the ambiguous-account error indicator
- **THEN** the popup explains that the GitHub account matches more than one GiTiempo account
- **AND** it directs the user to sign in with their email address instead

#### Scenario: Abandoned authorization window is not an error state
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the authorization window closes without reaching the extension redirect destination
- **THEN** the popup returns to its unauthenticated state reporting a cancelled attempt
- **AND** it does not present the attempt as a backend or configuration failure

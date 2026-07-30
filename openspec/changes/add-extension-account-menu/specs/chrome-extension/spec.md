## ADDED Requirements

### Requirement: Popup Header Opens An Account Menu
The popup header's user avatar SHALL open an account menu in every signed-in state. The menu MUST name the signed-in member and offer exactly two actions — opening their profile page in the user web app, and signing out — and MUST be dismissible without changing anything beneath it. It MUST NOT appear before sign-in, where there is no avatar and no session to act on.

#### Scenario: Avatar opens the account menu
- **GIVEN** the user is authenticated and the runtime snapshot carries a signed-in user
- **WHEN** the user activates the header avatar in any signed-in state
- **THEN** an account menu opens over the state beneath it
- **AND** the avatar reports itself as an expanded control to assistive technology
- **AND** the menu names the signed-in member, so the session being acted on is identified before it can be ended

#### Scenario: Menu offers the profile page and signing out
- **GIVEN** the account menu is open
- **WHEN** the user reads its actions
- **THEN** it offers opening the member's profile page and signing out, and no other action
- **AND** the header's existing home action remains available outside the menu

#### Scenario: Profile action opens the user web app profile page
- **GIVEN** the account menu is open
- **WHEN** the user chooses the profile action
- **THEN** the member's profile page in the user web app opens in a new browser tab
- **AND** the destination follows the configured user web app origin for the deployed environment

#### Scenario: Menu is dismissible without side effects
- **GIVEN** the account menu is open
- **WHEN** the user presses escape, points outside the menu, or chooses one of its actions
- **THEN** the menu closes
- **AND** dismissing it changes nothing about the state beneath it, including a running timer

#### Scenario: An open menu survives a timer tick
- **GIVEN** a timer is running, so the popup re-renders on its own each second
- **WHEN** the account menu is open across one of those re-renders
- **THEN** it stays open
- **AND** the re-render does not close, duplicate, or detach it

#### Scenario: No account menu before sign-in
- **GIVEN** the popup is still loading its state, or no valid extension session is available
- **WHEN** the popup renders the branded header
- **THEN** no account menu is reachable
- **AND** the header stays as it is specified for that state

### Requirement: Extension Can End Its Session
The extension SHALL end a session on request by revoking it with the backend and then clearing extension storage. It MUST clear extension storage even when the revoke fails, and afterwards every extension surface MUST behave as it does for a user who was never signed in.

#### Scenario: Signing out revokes before clearing
- **GIVEN** a stored extension session
- **WHEN** the user signs out from the account menu
- **THEN** the extension asks the backend to end the session bound to the stored refresh token
- **AND** it then clears the stored session from extension storage

#### Scenario: A failed revoke still ends the local session
- **GIVEN** a stored extension session
- **AND** the backend is unreachable or refuses the revoke
- **WHEN** the user signs out
- **THEN** the stored session is still cleared
- **AND** the user is not left signed in against their explicit request

#### Scenario: Every surface reflects the ended session
- **GIVEN** the user has just signed out
- **WHEN** the popup and any injected issue control next render
- **THEN** the popup shows its unauthenticated state
- **AND** the injected control no longer offers authenticated timer actions
- **AND** no further request is made with the cleared session

#### Scenario: Signing out does not stop a running timer
- **GIVEN** a timer is running for the signed-in member
- **WHEN** the user signs out
- **THEN** the timer is left running, because it belongs to the workspace rather than to the client that started it
- **AND** the menu names the running timer before the user signs out, so the outcome is not a surprise

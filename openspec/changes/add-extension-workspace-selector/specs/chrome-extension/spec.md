## MODIFIED Requirements

### Requirement: Popup Header Opens An Account Menu
The popup header's user avatar SHALL open an account menu in every signed-in state. The menu MUST identify the signed-in member, show a Workspace selector above Open profile, and offer opening the profile and signing out. It MUST be dismissible without changing underlying state merely by dismissal. It MUST NOT appear before sign-in.

#### Scenario: Avatar opens the account menu
- **GIVEN** the user is authenticated and the runtime snapshot carries a signed-in user
- **WHEN** the user activates the header avatar in any signed-in state
- **THEN** an account menu opens over the state beneath it
- **AND** the avatar reports itself as an expanded control to assistive technology
- **AND** the menu names the signed-in member, so the session being acted on is identified before it can be ended

#### Scenario: Menu offers workspace selection and profile and sign-out actions
- **GIVEN** the account menu is open
- **WHEN** the user reads its controls
- **THEN** the Workspace selector appears above Open profile, followed by Sign out
- **AND** the header's existing home action remains available outside the menu

#### Scenario: Profile action opens the user web app profile page
- **GIVEN** the account menu is open
- **WHEN** the user chooses the profile action
- **THEN** the member's profile page in the user web app opens in a new browser tab
- **AND** the destination follows the configured user web app origin for the deployed environment

#### Scenario: Menu is dismissible without side effects
- **GIVEN** the account menu is open
- **WHEN** the user dismisses the menu with Escape or an outside interaction
- **THEN** the menu closes without changing the session or a running timer
- **AND** activating Open profile or Sign out closes the menu while performing its specified action

#### Scenario: An open menu survives a timer tick
- **GIVEN** a timer is running, so the popup re-renders on its own each second
- **WHEN** the account menu is open across one of those re-renders
- **THEN** it stays open without being duplicated or detached
- **AND** workspace selection and keyboard focus are preserved

#### Scenario: No account menu before sign-in
- **GIVEN** the popup is still loading its state, or no valid extension session is available
- **WHEN** the popup renders the branded header
- **THEN** no account menu is reachable
- **AND** the header stays as it is specified for that state

## ADDED Requirements

### Requirement: Extension Shows Available Workspace Memberships
The extension SHALL obtain available workspaces from the authenticated membership API and identify the current workspace from its accepted session. The selector SHALL be labeled and keyboard accessible, with accessible loading, progress and error feedback.

#### Scenario: Multiple memberships are selectable
- **GIVEN** the member has multiple active workspace memberships
- **WHEN** membership loading succeeds
- **THEN** the selector shows the current workspace and allows selection of the returned memberships regardless of role
- **AND** choosing the already selected workspace makes no switch request

#### Scenario: One membership remains visible
- **GIVEN** the member has exactly one active membership
- **WHEN** membership loading succeeds
- **THEN** the selector displays that workspace and is disabled

#### Scenario: Membership loading or failure does not select a fallback
- **GIVEN** the account menu is open
- **WHEN** memberships are loading or fail to load
- **THEN** the selector is unavailable and shows loading or retryable error feedback respectively
- **AND** no fallback workspace is selected and profile/sign-out remain available

### Requirement: Extension Switches Its Own Workspace Session Safely
The extension SHALL switch via the existing authenticated workspace-switch contract and persist the returned access/refresh pair as one accepted session before publishing success. The extension SHALL keep its selection independent of web-app sessions and SHALL prevent stale authentication results from overwriting a newer session or reversing sign-out.

#### Scenario: Successful switch persists across extension lifecycle
- **GIVEN** the current workspace is A and the member chooses B
- **WHEN** switching succeeds
- **THEN** the extension stores the target token pair and displays B
- **AND** refresh, popup reopening and background-worker restart retain B while the session remains valid
- **AND** user/admin web-app sessions remain unchanged

#### Scenario: Concurrent rotations use the current session
- **GIVEN** refresh, a repeated selection or another switch overlaps a workspace switch
- **WHEN** the extension handles those requests
- **THEN** refresh-token rotations are serialized or coalesced using the latest accepted token pair
- **AND** stale results cannot overwrite the accepted workspace or sign the member out due solely to an avoidable client rotation race

#### Scenario: Sign-out or new login supersedes a pending switch
- **GIVEN** a switch is pending
- **WHEN** the member signs out or establishes a newer login
- **THEN** the switch result cannot restore the old session or replace the newer login
- **AND** a successful rotated pair arriving after sign-out is revoked with bounded best-effort cleanup without delaying local sign-out or affecting the newer session

#### Scenario: Removed target membership is rejected
- **GIVEN** B appeared in the membership list but access to it was revoked
- **WHEN** switching to B returns a membership denial
- **THEN** the extension keeps the valid current session, reloads memberships and shows actionable feedback
- **AND** it does not claim B is selected

#### Scenario: Failed or uncertain switch does not publish success
- **GIVEN** a switch encounters network failure or invalid authentication
- **WHEN** the outcome cannot establish a valid target session
- **THEN** the extension reports failure and reconciles authentication before enabling dependent actions
- **AND** it requires sign-in if recovery cannot establish a valid session
- **AND** it neither blindly replays an uncertain token rotation nor silently chooses another workspace

### Requirement: Workspace Switching Reconciles Tracking State
The extension SHALL invalidate previous workspace snapshots and tracking preflight on a switch, refresh authoritative timer and target-workspace capability state, and update the popup and injected controls. Switching SHALL NOT stop, migrate or relabel an existing entry. A running timer SHALL remain global to the user and stoppable across workspace contexts.

#### Scenario: Next timer starts in the selected workspace
- **GIVEN** there is no running timer and a switch to B succeeds
- **WHEN** fresh capabilities allow tracking and the member starts from the popup or a supported injected issue control
- **THEN** the destination shown and the newly created entry belong to B

#### Scenario: A running timer survives workspace switching
- **GIVEN** the member has a running timer in A
- **WHEN** the member switches to B
- **THEN** the same timer remains visible with its original workspace and elapsed time
- **AND** a second timer cannot start while it is active
- **AND** conditional Stop can stop that timer from B
- **AND** a subsequent permitted Start creates an entry in B

#### Scenario: Tracking mutation overlaps a switch
- **GIVEN** a timer mutation was accepted before a switch began
- **WHEN** the switch is requested
- **THEN** that mutation settles in its original context before the switch proceeds
- **AND** further timer mutations remain unavailable until target state is reconciled

#### Scenario: Old controls cannot act under a different workspace
- **GIVEN** a popup or injected control holds a preflight or action for A
- **WHEN** a switch to B begins or finishes
- **THEN** stale snapshots and actions are rejected or invalidated before dispatch
- **AND** open extension surfaces receive refreshed state before actions become available
- **AND** denied capability in B is displayed without reusing A's permission

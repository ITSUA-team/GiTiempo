## MODIFIED Requirements

### Requirement: Extension Can End Its Session

The extension SHALL end a session on request by invalidating in-flight session refreshes, clearing its stored GiTiempo session and extension-local Firebase authentication state, and attempting bounded best-effort backend revocation using the captured GiTiempo credentials. Local cleanup MUST NOT depend on a backend response. A successfully completed logout MUST leave every extension surface unauthenticated without ending sessions in other applications or identity-provider websites.

#### Scenario: Signing out clears locally and attempts revocation

- **GIVEN** a stored extension session
- **WHEN** the user signs out from the account menu
- **THEN** the extension captures the credentials required to revoke that session and invalidates pending session refresh results
- **AND** it clears the stored GiTiempo session and initiates extension-local Firebase sign-out without waiting for backend revocation
- **AND** it attempts bounded best-effort revocation of the captured backend session

#### Scenario: A failed revoke still ends the local session

- **GIVEN** a stored extension session
- **AND** the backend is unreachable or refuses the revoke
- **WHEN** the user signs out
- **THEN** the stored GiTiempo session and extension-local Firebase state are still cleared when local storage is available
- **AND** the user is not left signed in against their explicit request

#### Scenario: A revoke that never answers does not hold the session open

- **GIVEN** a stored extension session
- **AND** the revoke request stalls rather than failing
- **WHEN** the user signs out
- **THEN** both local authentication cleanup operations proceed without waiting for that request to settle
- **AND** the revoke attempt is bounded so logout completion does not wait indefinitely for the network

#### Scenario: A refresh in flight cannot restore an ended session

- **GIVEN** a token refresh is in flight when the user signs out
- **WHEN** that refresh completes afterwards with a rotated token pair
- **THEN** the pair is not stored, and the session stays ended
- **AND** the rotated pair is revoked, since the sign-out could only revoke the pair it was given

#### Scenario: Every surface reflects the ended session

- **GIVEN** the user has successfully signed out
- **WHEN** the popup and any injected issue control next render
- **THEN** the popup shows its unauthenticated state
- **AND** the injected control no longer offers authenticated timer actions
- **AND** no further request is made with the cleared session

#### Scenario: Signing out does not stop a running timer

- **GIVEN** a timer is running for the signed-in member
- **WHEN** the user signs out
- **THEN** the timer is left running, because it belongs to the workspace rather than to the client that started it
- **AND** the menu warns, before the action is taken, that the timer will keep running, so the outcome is not a surprise

#### Scenario: Firebase credentials do not survive successful logout

- **GIVEN** a Google or email/password sign-in persisted Firebase authentication state in the extension
- **WHEN** logout succeeds and the extension popup or background runtime is reopened
- **THEN** neither a GiTiempo token pair nor an authenticated Firebase user is restored from extension-local persistence
- **AND** the user's web-app and Google/GitHub website sessions are unaffected

#### Scenario: GitHub-only or repeated cleanup is safe

- **GIVEN** the extension has no Firebase session or its GiTiempo token pair has already been removed
- **WHEN** local logout cleanup is requested
- **THEN** missing session state is treated as already cleared
- **AND** any remaining provider authentication state is still cleaned up

#### Scenario: One local cleanup operation fails

- **GIVEN** Firebase persistence cleanup fails while GiTiempo storage remains available
- **WHEN** the user signs out
- **THEN** the extension still clears the GiTiempo session, invalidates pending refresh results, and attempts backend revocation
- **AND** it reports the incomplete provider cleanup through a recoverable error rather than claiming all authentication state was removed
- **AND** the user can retry provider cleanup without needing to establish another GiTiempo session

#### Scenario: Incomplete cleanup remains recoverable after reopening

- **GIVEN** provider cleanup failed after the GiTiempo session was removed
- **WHEN** the user reopens the popup, including after the background runtime restarts
- **THEN** the unauthenticated popup presents the incomplete-cleanup error with a `Retry sign-out` action
- **AND** the action retries provider cleanup without opening an authenticated account menu or requesting a new login
- **AND** the pending cleanup indicator contains no credentials and is removed when cleanup succeeds

## ADDED Requirements

### Requirement: Extension Uses Minimum Browser Permissions

The Chrome release package MUST request only `identity`, `storage`, and the host access needed for the configured GiTiempo API and supported GitHub integration. It MUST NOT request broad `tabs` access, wildcard access to unrelated hosts, or permissions reserved for future features. Supported browser behavior MUST be verified after permission changes.

#### Scenario: Chrome release manifest is inspected

- **GIVEN** the release package has been built with its intended environment
- **WHEN** its manifest permissions are reviewed
- **THEN** API permissions are limited to `identity` and `storage`
- **AND** host permissions are limited to the configured API origin and GitHub
- **AND** content-script matches remain restricted to the supported GitHub issue surfaces

#### Scenario: Supported tab behavior works with scoped access

- **GIVEN** the extension is installed with its minimum permissions
- **WHEN** the user opens supported GitHub issues and organization-project issue panes, with or without a `/views/{view}` path segment, and operates the timer
- **THEN** popup context resolution, injected controls, and updates across matching tabs continue to work
- **AND** opening the web app and profile continues to work
- **AND** Chrome verification records identify any necessary permission difference; Firefox runtime verification is explicitly deferred for this release-preparation pass, not reported as passed

#### Scenario: Pull requests remain outside extension scope

- **WHEN** the user opens a GitHub pull request
- **THEN** the extension does not inject timer controls or treat that page as a supported timer context
- **AND** content-script matches, background tab broadcasts, and release declarations exclude pull-request pages

### Requirement: Chrome Web Store Privacy Declarations Match the Release

The release documentation MUST maintain a reviewable inventory mapping extension data handling, browser permissions, and executable-code sources to the Chrome Web Store privacy fields for the exact candidate package. It MUST distinguish draft declarations, publisher-confirmed practices, and values actually verified in the Dashboard. Publication readiness MUST require consistency between the package, public policy, and Dashboard declarations.

#### Scenario: Data inventory is prepared

- **GIVEN** a candidate package and its data flows have been inspected
- **WHEN** privacy declarations are drafted
- **THEN** the inventory covers account/profile data, credentials and session tokens, GitHub page context/content, and timer records
- **AND** it distinguishes local processing from transmission to GiTiempo, Firebase/Google, and GitHub
- **AND** locally handled URL/title data is not omitted solely because it is not transmitted
- **AND** each category selection is justified against current Dashboard definitions without claiming full browsing-history or passive activity monitoring
- **AND** landing-only analytics is distinguished from the extension's handling of data

#### Scenario: Permissions and remote code are declared

- **GIVEN** the final manifest and bundled code are available
- **WHEN** their declarations are prepared
- **THEN** each requested permission and host has a justification tied to GitHub-linked time tracking
- **AND** a declaration of no remote executable code is supported by inspection of the built package
- **AND** API data requests and provider authentication pages are distinguished from remote code executed inside the extension

#### Scenario: Publisher facts or Dashboard access remain unverified

- **GIVEN** a policy fact, publisher certification, or Dashboard value has not been confirmed
- **WHEN** release readiness is assessed
- **THEN** that item remains an explicit unresolved publication prerequisite
- **AND** the checklist does not invent business facts or claim Store submission/readiness on the basis of a local code audit alone
- **AND** the review record contains no passwords, session tokens, private keys, or reviewer credentials

#### Scenario: Candidate is ready for submission

- **GIVEN** the candidate package and policy have been verified and publisher facts confirmed
- **WHEN** the Dashboard declarations are checked before submission
- **THEN** the record identifies package version and hash, policy URL, review date, category/permission decisions, and certification status
- **AND** the public policy and recorded Dashboard declarations agree with that candidate's behavior

#### Scenario: Publisher owns the Dashboard review

- **GIVEN** the publisher explicitly takes ownership of actual Store field verification
- **WHEN** the agent completes its engineering handoff
- **THEN** Dashboard review is recorded as an external publisher-owned follow-up, not an agent completion blocker
- **AND** the agent does not request Dashboard access or inspect, change or certify those fields
- **AND** engineering completion is distinguished from final Store submission readiness, which still requires the publisher's review

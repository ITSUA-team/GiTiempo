# Spec Delta

## Purpose

Define when GiTiempo's User and Admin SPAs communicate outcomes through notifications, keeping routine work quiet while preserving actionable failures, essential instructions, and accessible state changes.

## ADDED Requirements

### Requirement: Routine Visible Success Is Quiet

Both web SPAs SHALL complete ordinary successful actions without redundant success/info toasts or transient inline notices when the existing surface communicates the outcome. Notification removal MUST preserve authoritative state reconciliation, navigation, local form lifecycle, and existing request budgets.

#### Scenario: User mutations update visible state without a notification
- **GIVEN** a user creates, edits, or deletes a task or time entry, saves profile identity, or starts, stops, or reassigns a timer
- **WHEN** the action succeeds
- **THEN** the existing row, form, selection, or timer state reflects the authoritative result
- **AND** no redundant success/info toast or transient inline confirmation is inserted
- **AND** existing reconciliation and required reads still run without extra replacement requests

#### Scenario: Admin mutations update visible state without a notification
- **GIVEN** an authorized user changes projects, members, assignments, invoice-view permission, invitations, invoices, workspace settings, saved reports, or allowed GitHub organizations
- **WHEN** an ordinary mutation succeeds and its result is represented by the existing surface or destination
- **THEN** the visible state, counters, selection, dirty flags, dialog lifecycle, and navigation update as applicable
- **AND** no redundant success/info toast or transient inline confirmation is inserted
- **AND** informative exception outcomes remain governed by their separate requirements

#### Scenario: Existing status labels remain visible
- **GIVEN** a page displays a persistent connection badge, invoice status, saved/unsaved indicator, empty-state explanation, or access instruction
- **WHEN** redundant notifications are removed
- **THEN** those functional page states remain visible and are not removed based on success/info styling

### Requirement: Background Reconciliation Does Not Announce Routine Success

Successful background reads, refreshes, and automatic GitHub App reconciliation SHALL NOT emit routine success/info notifications. Existing loading/busy semantics, stale-action guards, retained content, access checks, and actionable failure feedback SHALL remain intact.

#### Scenario: Populated content refreshes successfully
- **GIVEN** a page has usable data for its authorized scope
- **WHEN** a background refresh succeeds
- **THEN** the existing data updates without a success/info toast or added inline status row
- **AND** the page keeps its existing content-preserving refresh and accessible busy behavior

#### Scenario: Automatic GitHub App setup confirms access
- **GIVEN** Settings automatically discovers or verifies an allowed organization's GitHub App installation
- **WHEN** reconciliation succeeds
- **THEN** the access card reflects the authoritative result without an access-confirmed success toast
- **AND** the automatic flow does not navigate away

### Requirement: Meaningful Exceptions Retain Feedback

The SPAs SHALL retain feedback that explains a partial failure, a recovery instruction, an otherwise invisible operation result, or an unexpected consequence. These exceptions MUST NOT be suppressed by a global success/info filter.

#### Scenario: Workspace switch succeeds but membership refresh fails
- **GIVEN** a switch activates the requested workspace but its membership-list refresh fails
- **WHEN** the switch settles
- **THEN** the partial-failure notice explains that the new workspace is active and its workspace list is not refreshed
- **AND** the failure is not presented as a complete switch failure or silent full success

#### Scenario: A stale timer action requires another user action
- **GIVEN** the authoritative running timer differs from the requested action's target
- **WHEN** reconciliation requires retry or stopping the current timer first
- **THEN** the existing recovery notification explains the required next action
- **AND** no different timer is stopped accidentally

#### Scenario: A stale timer is already stopped
- **GIVEN** a stop action discovers that no timer remains running
- **WHEN** authoritative reconciliation returns the visible timer to idle
- **THEN** the flow retains its successful recovery return value and state refresh
- **AND** the redundant timer-already-stopped info notification is omitted

#### Scenario: Backfill changes records outside the current surface
- **GIVEN** an authorized user applies task or project billable-default propagation
- **WHEN** the operation succeeds
- **THEN** the retained result notification reports the authoritative affected-record counts
- **AND** failure feedback never implies that existing records were updated

#### Scenario: Unarchive automatically renames a project
- **GIVEN** the original project name is occupied when an archived project is restored
- **WHEN** unarchive succeeds with a different authoritative name
- **THEN** feedback explains the resulting name and why it changed
- **AND** an ordinary unarchive without a rename remains quiet

#### Scenario: Invitation is created, canceled, or resent
- **GIVEN** an authorized user performs a pending-invitation action
- **WHEN** creation or cancellation succeeds
- **THEN** the updated pending list and counter communicate the outcome without a redundant success notification
- **AND** a successful resend retains its acknowledgement because it has no equivalent visible state change
- **AND** acknowledgement does not claim that the recipient received or read the email

#### Scenario: Report export starts a download
- **GIVEN** an authorized user exports the current report as CSV or PDF
- **WHEN** generation succeeds and the browser download is initiated
- **THEN** the retained acknowledgement identifies the export as ready or its download as started
- **AND** it does not claim that the file was saved to disk
- **AND** generation failures retain actionable error feedback

### Requirement: Auth Feedback Retains Instructions Without Duplicate Success

Auth flows SHALL preserve persistent instructions, validation, request errors, recovery, URL/token cleanup, and navigation while removing duplicate success notifications. Password-reset completion SHALL retain its existing success notification and login redirect.

#### Scenario: Password recovery email request succeeds
- **GIVEN** a visitor submits a valid recovery email in either SPA
- **WHEN** the provider accepts the request
- **THEN** the persistent check-your-email panel provides identical account-safe guidance for known and unknown emails
- **AND** no duplicate success toast is emitted

#### Scenario: Invite password setup succeeds
- **GIVEN** an invitee completes password setup successfully
- **WHEN** the page settles
- **THEN** its persistent success panel and contextual continuation action remain available with the required invite context
- **AND** the duplicate password-saved toast is omitted

#### Scenario: Invitation acceptance redirects or finds an existing membership
- **GIVEN** an invitee completes acceptance or already has access
- **WHEN** the flow redirects or displays its terminal panel
- **THEN** no redundant success/info toast or transient redirect-success notice is inserted
- **AND** loading, disabled guards, URL/token cleanup, and persistent terminal instructions remain intact

#### Scenario: Invitation is accepted but application sign-in fails
- **GIVEN** workspace access was created but the subsequent application session cannot be established
- **WHEN** sign-in fails
- **THEN** the existing partial-success recovery state and actionable error feedback remain available
- **AND** the flow does not silently redirect or claim that application sign-in succeeded

#### Scenario: New password is confirmed
- **GIVEN** a visitor successfully confirms a new password on either SPA's reset landing page
- **WHEN** the flow completes
- **THEN** the existing success notification explains that the visitor can sign in with the new password
- **AND** the existing login redirect is preserved without adding a new cross-origin notification-persistence mechanism

### Requirement: Provider Completion Keeps Cleanup And Failure Recovery

GitHub connection and App-installation success SHALL use authoritative card state without redundant success notifications. Supported callback parameters SHALL be consumed even when no success toast is emitted. Callback failures and follow-up read failures SHALL retain their distinct error and retry behavior.

#### Scenario: GitHub connection callback succeeds
- **GIVEN** Profile receives a supported connection-success callback
- **WHEN** the callback is handled
- **THEN** its handled parameters are removed without adding a history entry
- **AND** the normal connection-status request determines the rendered card state without an additional request or success toast

#### Scenario: Connection callback succeeds but status loading fails
- **GIVEN** a supported connection-success callback is received
- **WHEN** the subsequent connection-status request fails
- **THEN** callback parameters are still consumed
- **AND** the card shows its request-error state and retry with existing error feedback
- **AND** no success toast or fabricated connected/disconnected state replaces the failure

#### Scenario: GitHub callback reports an error
- **GIVEN** a supported callback-error result with a recognized, unknown, or missing safe error code is received
- **WHEN** the callback is handled
- **THEN** the existing safe error notification is shown and the handled parameters are removed
- **AND** unsupported callback-like parameters are not treated as a successful or failed provider result

#### Scenario: Explicit GitHub App setup completes
- **GIVEN** an authorized user finishes manual or callback-based installation setup
- **WHEN** the existing authoritative refresh succeeds
- **THEN** the access card communicates completion without a redundant success toast
- **AND** a failed follow-up read retains visible request-error/retry feedback rather than claiming confirmed access

#### Scenario: Disconnect has an unconfirmed provider revocation
- **GIVEN** local GitHub unlink succeeds but provider revocation cannot be confirmed
- **WHEN** the connection card settles to disconnected
- **THEN** the existing safe provider-revocation warning or error feedback remains
- **AND** removal of the ordinary disconnect success toast does not hide that exception

### Requirement: Quiet Feedback Has Accessible Regression Evidence

Notification changes SHALL preserve actionable read/write failures, client validation, retry, loading, disabled guards, destructive confirmation, and accessible status semantics. Verification SHALL cover representative successes and failures in both SPAs, every affected shared-helper consumer, and real desktop/mobile flows.

#### Scenario: A read or write fails
- **GIVEN** a changed flow encounters a genuine request failure
- **WHEN** it presents the outcome
- **THEN** the existing actionable error notification and applicable inline error/retry remain available, except for the explicitly inline-only pre-acceptance email/password sign-in failure below
- **AND** drafts and committed state retain their documented failure behavior
- **AND** pure client-side validation remains inline without a new toast

#### Scenario: Invitation email/password sign-in fails before acceptance
- **GIVEN** the invitation form authenticates the invited email and password before submitting acceptance
- **WHEN** Firebase authentication fails
- **THEN** the existing actionable inline error and diagnostic logging remain available
- **AND** no duplicate error toast is emitted for that authentication attempt
- **AND** the invite token and retryable form state remain available with controls reenabled
- **AND** invitation-acceptance failures and accepted-but-application-session-failed recovery retain their distinct existing error feedback

#### Scenario: A success notification is removed
- **GIVEN** a previously announced success now relies on an existing visible result
- **WHEN** keyboard behavior and rendered accessibility semantics are checked
- **THEN** focus restoration, busy semantics, and any necessary status announcement remain usable
- **AND** no generic replacement notification or live announcement is added merely to replace the removed toast

#### Scenario: Acceptance demonstrates quieter behavior
- **GIVEN** both SPAs are checked on desktop and below the mobile breakpoint
- **WHEN** representative success, failure, retry, and retained-exception scenarios run
- **THEN** evidence records expected and actual notification behavior, visible state, layout stability, request budgets, and accessibility results
- **AND** automated tests assert both absence of redundant notifications and correct state transitions without weakening failure coverage

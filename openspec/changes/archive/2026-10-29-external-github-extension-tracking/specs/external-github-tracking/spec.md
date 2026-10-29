## ADDED Requirements

### Requirement: External Reference Tracking Is Available By Default
The system SHALL allow active authenticated GiTiempo workspace members to record time against supported GitHub issue references by default. It MUST NOT require a personal GitHub link, usable GitHub credentials, an allowed organization, GitHub App installation, or administrator enablement. The server SHALL derive author and workspace from the authenticated session and treat page context as user-supplied work data, not proof of provider access.

#### Scenario: Unlinked member records customer work
- **GIVEN** a member belongs to the active workspace and a customer has not installed the App or been added to workspace organization policy
- **WHEN** the member starts a timer from a supported issue with valid context and no running timer
- **THEN** the reference start succeeds without GitHub API calls or a Connect GitHub/setup gate


#### Scenario: GitHub disconnect does not disable recording
- **GIVEN** a member can use external reference tracking
- **WHEN** their personal GitHub link is absent, expired, revoked, or disconnected
- **THEN** permitted starts, repeat starts, owned stopping, and history remain available through the GiTiempo session


#### Scenario: A browser session alone is insufficient
- **GIVEN** the browser can display a GitHub issue but the caller lacks a GiTiempo session or current workspace membership
- **WHEN** the caller attempts to record time
- **THEN** the request is denied without creating or exposing tracking records


### Requirement: Reference Starts Resolve Shared Identity Before Personal Visibility
The server MUST resolve an existing issue mapping before a repository mapping within the active workspace independently of the caller's read scope. For external-reference targets it SHALL reuse hidden mappings or atomically create missing private repository projects, tasks, references, and an owned entry. Repository and issue identity MUST ignore letter casing and MUST NOT include the tracking user. Tracking MUST NOT create project assignments.

#### Scenario: Two members share a hidden project and task
- **GIVEN** member A has recorded time on a repository issue and member B has no time or other access to it
- **WHEN** B starts that issue from the extension
- **THEN** B records time against the same project and task IDs; only after successful commit can B read them within B's own-time scope


#### Scenario: Another issue reuses the repository project
- **GIVEN** A tracked issue 15 and B cannot see its repository project
- **WHEN** B starts issue 28 from that repository
- **THEN** the existing project is reused, issue 28 is created or reused, and B can see issue 28 without learning issue 15


#### Scenario: Concurrent starts preserve identity
- **GIVEN** two authorized members start the same issue using different owner/repository casing
- **WHEN** both requests materialize work concurrently
- **THEN** at most one repository project and one issue task exist and each successful caller receives their own entry


#### Scenario: Failed first start grants nothing
- **GIVEN** a first reference start fails authorization or conflicts with an already running timer
- **WHEN** its transaction completes
- **THEN** it creates no project, task, reference, assignment, or entry and grants no derived visibility


#### Scenario: Workspace identity is isolated
- **GIVEN** the same repository has already been tracked in another workspace
- **WHEN** a member starts it in their current workspace
- **THEN** only current-workspace mappings are considered and no record or access is borrowed from the other workspace


### Requirement: Own Time Grants Only Scoped Project And Task Reads
Without separate access, an active member SHALL read an active external-reference project only while it contains their entries, including running entries, and only tasks containing their entries. Lists, detail, search, pickers, pagination and personal aggregates MUST enforce this scope. Own-time access MUST NOT grant management, reports or exports without existing role and explicit access checks, or disclose peer entries, task identities, member lists, totals or activity summaries.

#### Scenario: A running entry makes the target visible
- **GIVEN** the member has no prior entries or separate grant in an external project
- **WHEN** their first reference start commits
- **THEN** the active project and exact task immediately appear in their authorized reads


#### Scenario: A guessed sibling task is hidden
- **GIVEN** the member has own time in one task but none in another task of that external project
- **WHEN** they request the sibling task directly or through search or a picker
- **THEN** the sibling is withheld with the normal safe inaccessible-target response and its metadata is not included in counts or summaries


#### Scenario: Own-time access cannot edit shared work
- **GIVEN** the member can read a task only because of their own time
- **WHEN** they try to edit or delete the task, change project settings, create a generic shared task, or manage assignments
- **THEN** the server denies the shared mutation without treating own-time visibility as management authorization


#### Scenario: Privileged access is independent
- **GIVEN** an administrator or explicitly authorized project member requests external work
- **WHEN** the server evaluates scope
- **THEN** the administrator retains full workspace authority and the explicitly authorized member receives only their existing grant and role capabilities; tracking alone never grants PM management or peer access


### Requirement: Derived Visibility Follows Current Own Entries
Derived visibility MUST be evaluated from current own entries rather than a permanent participation grant. Removing or moving the last own entry from a task MUST remove derived task visibility; losing all own entries in the project MUST remove derived project visibility. Separate explicit authorization SHALL remain valid. Shared records and other users' entries MUST remain intact.

#### Scenario: Last task entry is deleted
- **GIVEN** a member has own entries in tasks A and B and no separate access grant
- **WHEN** they delete their final completed entry in A
- **THEN** A disappears from their reads while the project and B remain visible; other users' data is unchanged


#### Scenario: Last project entry is moved or deleted
- **GIVEN** a member has one own completed entry in an external project and no separate grant
- **WHEN** they delete it or move it to another already authorized active open task
- **THEN** the former task and project cease to be readable through derived access and the client refreshes affected lists and pickers


#### Scenario: Stale saved task identifiers do not restore visibility
- **GIVEN** the caller has lost all own entries for a task and has no separate grant
- **WHEN** they use a stale saved-task identifier to start a timer
- **THEN** the start is denied; a new valid extension reference start can establish own-time access again


#### Scenario: Running-entry deletion stays prohibited
- **GIVEN** a running entry is the only source of derived visibility
- **WHEN** the caller attempts to delete that running entry
- **THEN** existing running-entry mutation rules reject deletion while owned conditional stop remains available


### Requirement: Managed Mappings Cannot Be Bypassed By Reference Starts
An existing managed issue or repository mapping MUST retain its tracking authorization, visibility, assignment, billing, and state rules. A reference request resolving to a managed target MUST use installation authorization; denial or provider failure MUST NOT fall back to reference materialization or create a duplicate. Imported board mappings MUST retain existing issue ownership. An external target MUST NOT silently change mode after later import or integration setup.

#### Scenario: An existing restricted project denies a new caller
- **GIVEN** an issue resolves to a managed private project the caller cannot access
- **WHEN** the caller attempts a reference start
- **THEN** the request is denied without revealing protected mapping details or creating a new project/task/entry


#### Scenario: Installation failure cannot change policy
- **GIVEN** a managed mapped target requires an installation that is missing, revoked, or unavailable
- **WHEN** the updated extension starts it through the reference entry point
- **THEN** existing managed checks return their safe failure and no reference fallback occurs


#### Scenario: Import preserves an external mapping
- **GIVEN** a repository already has an external-reference project, including an inactive one
- **WHEN** a later import attempts to reuse or reassign its identity
- **THEN** the existing project is reused without policy conversion or the conflicting reassociation is rejected; historical issue ownership is not split or stolen


### Requirement: Reference Starts Preserve Owned Timer And Billing Rules
Reference starts MUST enforce current membership, active project/task state, open task state, task billing defaults, one running timer per user across workspaces, and the extension source. Saved-task repeats MUST enforce the same stored external access policy without a GitHub-link or assignment prerequisite for own-time readers. Own stop/history SHALL retain existing GiTiempo authorization and expected-timer concurrency behavior.

#### Scenario: Saved external work can be resumed
- **GIVEN** an active member has own time in an active open external task and no current timer, assignment, or GitHub link
- **WHEN** they start the saved task from a supported web surface
- **THEN** the start succeeds with the existing task billing default and web source


#### Scenario: Lost start response is reconciled
- **GIVEN** the server committed a timer but the extension did not receive its response
- **WHEN** the client retries and receives a running-timer conflict
- **THEN** it refreshes the authoritative current timer and creates no second entry


#### Scenario: Concurrent membership removal is enforced
- **GIVEN** membership removal completes before the start authorization/write boundary
- **WHEN** a pending reference start reaches that boundary
- **THEN** it is denied and materialization is rolled back


#### Scenario: Own stop survives integration changes
- **GIVEN** a user owns a running reference timer and later disconnects GitHub
- **WHEN** they stop it with valid GiTiempo authorization and the correct expected timer identifier
- **THEN** the timer stops without GitHub calls and history remains intact


### Requirement: Reference Context Does Not Claim Provider Verification
The server SHALL validate supported canonical issue references and bounded plain-text titles without fetching caller URLs. User-supplied context MUST be distinguishable from synchronized metadata, MUST NOT overwrite an existing task's shared title/state, and MUST NOT claim verified private-resource access. Repository rename/transfer reconciliation is outside this release.

#### Scenario: Untrusted context is bounded
- **GIVEN** a reference start contains inconsistent repository/number/URL, unsupported host, invalid number, or overlong title
- **WHEN** the input is validated
- **THEN** the request is rejected before any writes or external fetch


#### Scenario: Existing title is preserved
- **GIVEN** another member has already materialized an issue task
- **WHEN** a caller starts it with a different page title
- **THEN** the existing shared title, state, and provenance are not overwritten by the request

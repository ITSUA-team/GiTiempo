## ADDED Requirements

### Requirement: External Items Reuse Existing Views
External-reference projects and tasks SHALL use the existing Projects sections, task rows/cards, dialogs and selectors. The UI SHALL add a compact `External` tag based on server-owned tracking policy without introducing external-only pages, routes, navigation sections, or parallel view components. Existing capability and data-scope restrictions SHALL still apply within those components.

#### Scenario: Managed and external projects share the Projects page
- **GIVEN** the server returns both managed and external-reference projects
- **WHEN** the member opens the existing Projects page
- **THEN** both use the existing project-section and task row/card structure
- **AND** only external-reference projects and tasks carry the `External` tag
- **AND** no separate external-project or external-task view is required.

#### Scenario: Own-time project explains its scope with contextual help
- **GIVEN** an external-reference project has `accessScope: "own-time"`
- **WHEN** its existing Projects card or section renders
- **THEN** a `?` help control explains `You can only see your own time and tasks with your time entries.`
- **AND** the explanation is available on hover, keyboard focus, and tap/click with an accessible control name
- **AND** Escape or outside interaction dismisses the explanation
- **AND** it does not require a dedicated page or permanent explanatory panel.

#### Scenario: Full project access does not show an own-time-only explanation
- **GIVEN** an external-reference project has `accessScope: "project"`
- **WHEN** an administrator or separately authorized member views it
- **THEN** its `External` tag remains visible
- **AND** the UI does not claim that only the viewer's own time is visible
- **AND** the existing view follows the server-provided scope and capabilities.

### Requirement: User Projects List Enforces Own-Time Scope
The user Projects page SHALL render the server-authorized project and task collection only. For an external-reference project returned with `accessScope: "own-time"`, it SHALL show only the member's project/tasks that have own time entries, including a running entry, and SHALL treat that scope as read-only for shared project data.

#### Scenario: External project stays absent before own time exists
- **GIVEN** another workspace member has recorded time in an external-reference project
- **AND** the current member has no own time entry in that project and no separately granted project access
- **WHEN** the Projects list loads
- **THEN** the page does not render that project or any of its tasks
- **AND** frontend search and task suggestions cannot reveal it.

#### Scenario: Start makes the returned own-time project visible
- **GIVEN** an extension reference start succeeds for the current member
- **WHEN** the Projects list refreshes or reconciles its data
- **THEN** it renders the returned external project and the task of the new running entry
- **AND** it does not render other tasks in that project unless each is separately returned by the server.

#### Scenario: Own-time scope removes shared controls
- **GIVEN** a project or task response has `accessScope: "own-time"` and `canManageTasks: false`
- **WHEN** the Projects page renders that project section
- **THEN** it does not render Add task, task create, task edit, task delete, project member, or shared configuration controls
- **AND** it does not infer management authority from the task's presence in the list.

#### Scenario: Own-time summaries remain personal
- **GIVEN** a project response has `accessScope: "own-time"`
- **WHEN** the Projects page renders count or time summary data
- **THEN** it uses only server-provided values scoped to the current member
- **AND** it does not render members, member count, assigned-member summary, colleague totals, or a placeholder implying those values are zero.

#### Scenario: Losing final own-time visibility clears stale data
- **GIVEN** the current member's visible external project or task has only one own time entry
- **WHEN** that entry is deleted or moved to another task or project and the server response no longer authorizes the original item
- **THEN** the page removes the task from local list, search, and picker state
- **AND** it removes the project when it has no remaining authorized tasks
- **AND** it clears a selected hidden project/task and closes any dialog whose target is no longer authorized.

#### Scenario: Explicit project access remains distinct from own-time access
- **GIVEN** a response grants `accessScope: "project"`
- **WHEN** the Projects page renders the project
- **THEN** it follows the separately returned capabilities for management and summaries
- **AND** it does not downgrade or augment those capabilities based only on the member's own time entries.

### Requirement: User Projects Direct Actions Respect Server Capabilities
The Projects page SHALL render direct timer actions for returned visible tasks while gating task mutation controls on `canManageTasks` and clearing local data after an authorization change.

#### Scenario: Own-time task can repeat start
- **GIVEN** an own-time task is visible and the current timer guard permits a new timer
- **WHEN** the member activates its direct Start timer action
- **THEN** the app starts a fresh timer for that same returned task
- **AND** it does not require project assignment or expose other project tasks.

#### Scenario: Capability change reconciles stale rows
- **GIVEN** a project or task mutation, timer mutation, workspace switch, or refresh returns a different scope or removes an item
- **WHEN** the Projects page reconciles client state
- **THEN** it replaces capability data from the latest response
- **AND** it removes controls and cached rows that are no longer authorized before further user interaction.

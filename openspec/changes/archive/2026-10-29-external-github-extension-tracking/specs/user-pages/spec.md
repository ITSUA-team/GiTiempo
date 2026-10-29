## ADDED Requirements

### Requirement: User Timer Pickers Honor Scoped Project Visibility
The global top-bar timer picker and manual time-entry project/task selectors SHALL use only server-returned visible projects and tasks. They SHALL preserve the distinction between `accessScope: "own-time"` and `accessScope: "project"` without exposing peer data.

#### Scenario: Own-time task is available for repeat tracking
- **GIVEN** the current member has an external-reference task returned with `accessScope: "own-time"`
- **WHEN** the idle top-bar picker or a manual-entry task selector lists visible tasks
- **THEN** it offers that returned task for repeat tracking
- **AND** it does not append or search sibling tasks from the same project that were not returned.

#### Scenario: Hidden project cannot persist as a stale selection
- **GIVEN** an external project/task was selected in a picker or dialog
- **WHEN** a refresh, delete, or moved own time entry removes its authorization
- **THEN** the picker or dialog clears that selection before submission
- **AND** it does not submit its former project or task identifier.

#### Scenario: Own-time scope does not expose member summaries
- **GIVEN** a picker, history row, or dashboard card renders an item with `accessScope: "own-time"`
- **WHEN** it displays project/task metadata
- **THEN** it uses only the current member's permitted task and entry information
- **AND** it does not display team members, assigned-member summaries, project-wide counts, or peer time totals.

### Requirement: User Time Entry Views Maintain Own-Time Derived Visibility
The Dashboard, Time Entries history, repeat-start controls, and direct routes SHALL keep external-reference project/task visibility synchronized with the current member's own entries. A running entry counts as own time immediately.

#### Scenario: Reference start is visible on the next authoritative refresh
- **GIVEN** an extension reference start succeeds and returns a running time entry
- **WHEN** the Dashboard, Time Entries page, or a direct task/project route next refreshes authoritative data on navigation or refocus
- **THEN** the relevant view adds or refreshes only that returned entry/project/task within its authorized scope
- **AND** it does not fetch or reveal peer tasks or time while reconciling.

#### Scenario: Last own entry removal removes derived UI visibility
- **GIVEN** the current member deletes or moves their final entry for an external task or project
- **WHEN** the mutation response or subsequent list response no longer includes that resource
- **THEN** Dashboard recent entries, Time Entries filters, history rows, repeat-start actions, picker options, and direct-route data remove the resource
- **AND** a direct route to the removed resource renders the existing authorized not-found or access state without stale cached content.

#### Scenario: Repeat start keeps scope boundaries
- **GIVEN** a completed entry for an own-time external task appears in history or Dashboard recent entries
- **AND** no running timer blocks a new timer
- **WHEN** the member activates `Start timer`
- **THEN** the app starts a timer only for that returned task
- **AND** it does not request project-wide task data as part of the repeat start.

#### Scenario: Scope changes invalidate cached summaries
- **GIVEN** a response changes an item's `accessScope` from `project` to `own-time`, or removes the item
- **WHEN** user-page state reconciles the response
- **THEN** it clears cached members/assignedMembersSummary and project-wide totals before rendering
- **AND** it recomputes visible dashboard and history values from the authorized current-member entry set.

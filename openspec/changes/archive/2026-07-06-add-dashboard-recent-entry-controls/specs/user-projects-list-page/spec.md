## MODIFIED Requirements

### Requirement: User Projects Client Boundary Regression Safety
Extending the user-web time/task client for Projects page task update and delete operations MUST NOT force unrelated feature modules to depend on the full mutable task-management client surface; Dashboard overview MAY depend on the narrow own-entry read and timer lifecycle client surface required by Dashboard recent-entry controls.

#### Scenario: Dashboard overview keeps a narrow client dependency
- **GIVEN** the dashboard overview feature reads own time entries and owns direct Dashboard recent-entry timer actions
- **WHEN** the Projects page adds task update and delete methods to the existing time/task client
- **THEN** the dashboard overview composable depends on a narrow client boundary for own-entry listing, current-timer guard state, timer start, and timer stop operations
- **AND** dashboard overview specs do not need to mock unrelated task management methods such as `updateTask`, `deleteTask`, task creation, project member assignment, or project mutation methods

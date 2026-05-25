## MODIFIED Requirements

### Requirement: User Projects List Layout
The Projects list page MUST match the approved user Projects list design and render visible projects grouped with their active tasks.

#### Scenario: Task updated metadata keeps UTC calendar labels
- **GIVEN** a visible project task has an `updatedAt` timestamp
- **WHEN** the Projects list page renders the task's updated metadata
- **THEN** Today and Yesterday labels are determined from UTC calendar dates
- **AND** moving the implementation to `date-fns` and `@date-fns/utc` does not switch those labels to browser-local day comparisons

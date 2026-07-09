## ADDED Requirements

### Requirement: User Activity Tracking Spec Has Purpose Metadata

The OpenSpec catalog SHALL carry purpose metadata for the `user-activity-tracking` specification without changing the existing activity-tracking behavior requirements.

#### Scenario: User activity tracking purpose is present after archive

- **WHEN** this change is applied or archived into the canonical specs
- **THEN** the `user-activity-tracking` spec includes a `## Purpose` section before `## Requirements`
- **AND** the purpose explains that successful time-tracking writes update member activity metadata without making the primary write depend on activity bookkeeping
- **AND** existing requirements and scenarios remain semantically unchanged

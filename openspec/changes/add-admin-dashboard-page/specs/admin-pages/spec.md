## MODIFIED Requirements

### Requirement: Admin Dashboard Summary

The admin dashboard MUST summarize workspace state through a design-matched stat header, four role-appropriate summary cards, and a design-matched recent activity feed using only existing API-backed data.

#### Scenario: Dashboard renders summary surfaces

- GIVEN an admin or project manager opens the dashboard
- WHEN the page renders
- THEN it shows a `Dashboard` header with supporting copy matching the approved Admin Dashboard design
- AND it shows four summary cards for current workspace metrics derived from endpoints allowed for the authenticated role
- AND it shows a recent-activity feed matching the approved compact row design
- AND PM users do not require member or invite management endpoints to render the dashboard
- AND it does not require backend, shared contract, database, seed, migration, or OpenAPI changes

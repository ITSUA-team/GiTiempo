## MODIFIED Requirements

### Requirement: Admin Dashboard Summary

The admin dashboard MUST summarize workspace state through a design-matched stat header, four summary cards, and a PrimeVue recent activity table using only existing API-backed data.

#### Scenario: Dashboard renders summary surfaces

- GIVEN an admin or project manager opens the dashboard
- WHEN the page renders
- THEN it shows a `Dashboard` header with supporting copy matching the approved Admin Dashboard design
- AND it shows four summary cards for current workspace metrics derived from existing endpoints
- AND it shows a recent-activity surface using PrimeVue DataTable patterns
- AND it does not require backend, shared contract, database, seed, migration, or OpenAPI changes

## MODIFIED Requirements

### Requirement: Shared Empty And Loading States

The frontend MUST use consistent empty-state and loading-state patterns across pages.

#### Scenario: Empty list or dashboard section

- GIVEN a page section has no data to render
- WHEN the section is shown
- THEN it uses the shared empty-state pattern with primary message and optional action

#### Scenario: Full-page asynchronous load

- GIVEN a page is waiting for required data to load
- WHEN the page is not yet ready
- THEN it presents the shared loading-state pattern appropriate for the page scope

#### Scenario: Structured settings first load

- GIVEN a content-rich settings page is waiting for required initial data
- WHEN the page is not yet ready
- THEN it may use PrimeVue Skeleton placeholders matching the final header, card, form rows, and action layout
- AND request-error states remain distinct from empty states or default form values

# Backend Data Model Specification

## Purpose

Define the observable backend data-model behavior that the API and future changes rely on for users, workspace structure, task tracking, and billing.

## Requirements

### Requirement: Single-Tenant Workspace Ownership

The system SHALL operate as a single-tenant MVP with one seeded default workspace that owns operational records.

#### Scenario: Seeded workspace exists for initial deployment

- GIVEN the application is initialized for the first time
- WHEN seed data is applied
- THEN a default workspace is created
- AND operational records attach to that workspace context

### Requirement: Firebase-Backed User Identity

Each local user record MUST be uniquely associated with one Firebase identity.

#### Scenario: Firebase identity maps to local user

- GIVEN a verified Firebase identity signs in
- WHEN the backend resolves the local user record
- THEN the lookup uses the unique Firebase UID
- AND the same Firebase UID cannot belong to more than one user record

### Requirement: One Running Timer Per User

The system MUST prevent a user from having multiple running timers at the same time.

#### Scenario: Start a timer when no timer is running

- GIVEN a user has no running time entry
- WHEN the user starts a timer
- THEN the backend creates one running time entry for that user

#### Scenario: Start a second timer while one is active

- GIVEN a user already has a running time entry
- WHEN the user attempts to start another timer
- THEN the backend rejects or prevents creation of a second concurrent running time entry

### Requirement: Project And Task Soft-Disable

Projects and tasks SHOULD remain representable after deactivation instead of being removed by hard delete.

#### Scenario: Deactivated project remains referenceable

- GIVEN a project is no longer active
- WHEN the project is disabled
- THEN the project remains stored with inactive state
- AND related historical data can still reference it

#### Scenario: Deactivated task remains referenceable

- GIVEN a task is no longer active
- WHEN the task is disabled
- THEN the task remains stored with inactive state
- AND existing time entries continue to reference it

### Requirement: Invoice Snapshot Totals

Invoices MUST keep snapshot totals that are not automatically recalculated by later time-entry edits.

#### Scenario: Invoice preserves historical totals

- GIVEN an invoice has been created from a set of time entries
- WHEN one of those time entries changes later
- THEN the existing invoice totals remain as originally captured
- AND linked time entries stay associated with the invoice unless explicitly changed

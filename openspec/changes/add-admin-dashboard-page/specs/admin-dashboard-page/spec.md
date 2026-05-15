## ADDED Requirements

### Requirement: Admin Dashboard Page Renders Current Workspace Overview

The admin Dashboard page MUST replace the placeholder with a PrimeVue/Tailwind workspace overview inside the authenticated admin shell, using only existing API endpoints.

#### Scenario: Dashboard page renders approved structure within current API scope

- **WHEN** an authenticated admin or PM opens the Dashboard page
- **THEN** the page renders a `Dashboard` header with supporting copy based on the approved `GITiempo.pen` Admin Dashboard design
- **AND** the page renders four summary stat cards in the approved dashboard card treatment
- **AND** the page renders a `Recent Activity` surface below the summary cards
- **AND** the page uses the authenticated admin shell with Dashboard navigation active

#### Scenario: Dashboard uses existing endpoints only

- **WHEN** the Dashboard loads data
- **THEN** it uses existing members, invites, projects, and reports/time endpoints or existing admin-web clients
- **AND** it does not require a new dashboard, activity, invoice, or aggregate endpoint
- **AND** it does not require shared contract, database, seed, migration, or OpenAPI changes

### Requirement: Admin Dashboard Summary Cards Use Current Data

The admin Dashboard summary cards MUST be derived from currently available workspace data without inventing unsupported metrics.

#### Scenario: Summary cards render API-backed metrics

- **WHEN** dashboard data loads successfully
- **THEN** the summary cards include active member count derived from current member data
- **AND** they include hours this week derived from current report/time data
- **AND** they include active project count derived from current project summary or project list data
- **AND** the fourth card is either current API-backed data such as pending invites or an inactive future invoice metric that is clearly not persisted or API-backed

#### Scenario: Unsupported invoice metrics are not invented

- **WHEN** invoice endpoints or contracts are unavailable
- **THEN** the Dashboard does not display fabricated open invoice totals or invoice activity as real data
- **AND** any invoice-related card or activity remains inactive/future-labeled until a separate API change provides data

### Requirement: Admin Dashboard Recent Activity Uses Design Feed

The admin Dashboard recent activity surface MUST render as a compact feed matching the approved design.

#### Scenario: Recent activity feed renders derived rows

- **WHEN** dashboard data loads successfully and activity-like data is available
- **THEN** Recent Activity renders feed rows with circular type indicators, activity text, and relative or formatted time information
- **AND** rows are derived from current endpoint data such as member activity, invite creation, project updates, and report/time timestamps
- **AND** rows are sorted newest first and limited to the dashboard's compact recent activity surface
- **AND** visible type/status labels are not rendered as tags or table columns
- **AND** circular indicators expose their activity type with the same PrimeVue tooltip treatment used by navigation and accessible label text

#### Scenario: Recent activity empty state is distinct

- **WHEN** dashboard data loads successfully but no activity rows can be derived
- **THEN** the Recent Activity feed area renders the shared empty-state treatment
- **AND** it does not render a request-error message or fabricated activity rows

### Requirement: Admin Dashboard Handles Async States

The admin Dashboard page MUST keep loading, request-error, and empty states visually and behaviorally distinct.

#### Scenario: Initial loading renders dashboard skeleton

- **WHEN** required dashboard data is still loading for the first time
- **THEN** the page renders PrimeVue Skeleton placeholders matching the dashboard header, four stat cards, and recent activity feed
- **AND** it does not render empty dashboard copy before the first required requests complete

#### Scenario: Request failure remains retryable

- **WHEN** a required dashboard request fails
- **THEN** the page renders a request-error state with retry affordance
- **AND** the failure is surfaced through standard toast feedback
- **AND** the failed load is not collapsed into empty or default dashboard data

### Requirement: Admin Dashboard Follows Design-System And Component Reuse Rules

The admin Dashboard implementation MUST use project-standard PrimeVue and shared frontend component conventions.

#### Scenario: Dashboard reuses shared stat leaves and token styling

- **WHEN** the Dashboard is implemented
- **THEN** it reuses existing shared stat/header leaves such as `StatsHeader` and `StatCard` when their structure fits the approved design
- **AND** it uses PrimeVue components where appropriate for buttons and skeletons
- **AND** it uses token-backed Tailwind utilities and PrimeVue `pt` overrides instead of raw hex classes, deep selectors, or raw standard app controls

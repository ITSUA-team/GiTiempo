## ADDED Requirements

### Requirement: Admin Dashboard Page Renders Current Workspace Overview

The admin Dashboard page MUST replace the placeholder with a PrimeVue/Tailwind workspace overview inside the authenticated admin shell, using only existing API endpoints.

#### Scenario: Dashboard page renders approved structure within current API scope

- **WHEN** an authenticated admin or PM opens the Dashboard page
- **THEN** the page renders a `Dashboard` header with supporting copy based on the approved `GITiempo.pen` Admin Dashboard design
- **AND** the page renders four role-appropriate summary stat cards in the approved dashboard card treatment
- **AND** the page renders a `Recent Activity` surface below the summary cards
- **AND** the page uses the authenticated admin shell with Dashboard navigation active

#### Scenario: Dashboard uses existing endpoints only

- **WHEN** the Dashboard loads data
- **THEN** it uses existing members, invites, projects, and reports/time endpoints or existing admin-web clients only where the authenticated user's role is allowed to use them
- **AND** it does not require a new dashboard, activity, invoice, or aggregate endpoint
- **AND** it does not require shared contract, database, seed, migration, or OpenAPI changes

#### Scenario: PM dashboard avoids admin-only member and invite clients

- **WHEN** an authenticated PM opens the Dashboard page
- **THEN** dashboard data loading does not call member list or invite list clients
- **AND** it uses existing project summary, project list, and reports/time clients only
- **AND** dashboard metrics and activity remain scoped to the PM-visible project/report data returned by those endpoints

### Requirement: Admin Dashboard Summary Cards Use Current Data

The admin Dashboard summary cards MUST be derived from currently available workspace data without inventing unsupported metrics.

#### Scenario: Admin summary cards render API-backed metrics

- **WHEN** dashboard data loads successfully for an admin
- **THEN** the summary cards include active member count derived from current member data
- **AND** they include hours this week derived from current report/time data
- **AND** they include pending invites derived from current invite data
- **AND** they include active project count derived from current project summary or project list data

#### Scenario: PM summary cards render PM-safe metrics

- **WHEN** dashboard data loads successfully for a PM
- **THEN** the summary cards are derived only from project summary, project list, and reports/time data
- **AND** they include active project count derived from current project summary or project list data
- **AND** they include hours this week derived from current report/time data
- **AND** they include public project count derived from current project summary data
- **AND** they include private project count derived from current project summary data

#### Scenario: Hours this week uses a local-week report window

- **WHEN** the Dashboard queries reports/time for Hours This Week
- **THEN** it sends `dateFrom` as the user's local Monday at `00:00:00.000` converted to ISO
- **AND** it sends `dateTo` as the current dashboard request time converted to ISO
- **AND** it treats the backend's `dateTo` as an exclusive upper boundary
- **AND** it requests `groupBy=project`, `page=1`, `limit=100`, `sortBy=lastStartedAt`, and `sortOrder=desc`

#### Scenario: Unsupported invoice metrics are not invented

- **WHEN** invoice endpoints or contracts are unavailable
- **THEN** the Dashboard does not display fabricated open invoice totals or invoice activity as real data
- **AND** it does not render invoice cards or invoice activity as current dashboard data until a separate API change provides data

### Requirement: Admin Dashboard Recent Activity Uses Design Feed

The admin Dashboard recent activity surface MUST render as a compact feed matching the approved design.

#### Scenario: Recent activity feed renders derived rows

- **WHEN** dashboard data loads successfully and activity-like data is available
- **THEN** Recent Activity renders feed rows with circular type indicators, activity text, and relative or formatted time information
- **AND** rows are derived from current endpoint data such as member activity, invite creation, project updates, and report/time timestamps
- **AND** rows are sorted newest first and limited to the dashboard's compact recent activity surface
- **AND** visible type/status labels are not rendered as tags or table columns
- **AND** circular indicators expose their activity type with the same PrimeVue tooltip treatment used by navigation and accessible label text

#### Scenario: PM recent activity excludes admin-only member and invite rows

- **WHEN** dashboard data loads successfully for a PM and activity-like data is available
- **THEN** Recent Activity derives rows from PM-safe project updates and report/time timestamps only
- **AND** it does not require member or invite activity data

#### Scenario: Recent activity can expand locally when more rows exist

- **WHEN** more than five recent activity rows are available
- **THEN** Recent Activity initially previews the first five rows
- **AND** it renders a PrimeVue button labeled `View all activity`
- **AND** activating the button expands the feed locally without navigating or calling a new endpoint
- **AND** the expanded feed can collapse back to the five-row preview

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

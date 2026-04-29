# Frontend Admin Pages Specification

## Purpose

Define admin and project-manager SPA behavior for the admin-facing product pages in `admin-web`.

## Requirements

### Requirement: Admin Login Entry Page

The `admin-web` app MUST provide a dedicated login page that offers the supported authentication methods and keeps the admin product visually distinct while following the shared auth direction.

#### Scenario: Login page renders admin entry sections

- **WHEN** an anonymous user opens the admin login route
- **THEN** the page shows the branded admin hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action
- **AND** the page exposes a visible link back to `user-web`

### Requirement: Authenticated Admin Page Entry Expectations

Each admin-facing page in `admin-web` MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Admin page loads through authenticated route tree

- **WHEN** a user opens any admin-facing page in the admin-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

### Requirement: Admin Dashboard Summary

The admin dashboard SHALL summarize workspace state through stat cards and recent activity.

#### Scenario: Dashboard renders summary surfaces

- GIVEN an admin or project manager opens the dashboard
- WHEN the page renders
- THEN it shows summary cards for key metrics
- AND it shows a recent-activity surface using the established table pattern

### Requirement: Reports Filtering And Export

The reports page MUST support near-real-time filtering and export while preserving project-scope restrictions for PM users.

#### Scenario: Report filters update results

- GIVEN a report page with active filters
- WHEN the user changes filter inputs
- THEN the results update after the configured debounce behavior
- AND the summary totals stay aligned with the filtered result set

#### Scenario: PM stays inside assigned scope

- GIVEN the current user is a PM rather than an admin
- WHEN they use the reports page
- THEN they cannot expand filters beyond assigned project scope

### Requirement: Invoice Creation Workflow

The invoices page SHALL provide invoice creation through a modal workflow.

#### Scenario: Create invoice from dialog

- GIVEN a user opens the invoice creation flow
- WHEN the dialog is rendered
- THEN the dialog exposes project, date range, rate, discount, and total amount inputs

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows member identity, role, project assignment context, and actions

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout
- AND save actions remain discoverable at section level or page bottom

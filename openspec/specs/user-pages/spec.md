# Frontend User Pages Specification

## Purpose

Define user-facing SPA behavior for the member-oriented pages in `user-web`.

## Requirements

### Requirement: Login Entry Page

The user-web app MUST provide a dedicated login page that matches the approved entry design and exposes the supported authentication methods.

#### Scenario: Login page renders approved entry sections

- **WHEN** an anonymous user opens the login route
- **THEN** the page shows the branded hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action

### Requirement: Authenticated Page Entry Expectations

Each member-facing page in the user-web app MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Member page loads through authenticated route tree

- **WHEN** a user opens any member-facing page in the user-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

### Requirement: User Dashboard Overview

The user dashboard SHALL expose the active timer state and recent time-entry activity.

#### Scenario: Dashboard with running timer

- GIVEN the user has a running timer
- WHEN the dashboard loads
- THEN the page shows the active timer widget prominently
- AND the page includes the stop action for that timer

#### Scenario: Dashboard with no recent data

- GIVEN the user has no recent time entries or active timer
- WHEN the dashboard loads
- THEN the dashboard uses the shared empty-state pattern for the missing sections

### Requirement: Timer Workflow Page

The timer page MUST support task selection and manual fallback behavior when GitHub-linked selection is unavailable.

#### Scenario: Timer started from task selection

- GIVEN the user can browse available organization, project or repo, and issue choices
- WHEN the user selects a task and starts timing
- THEN the page shows the running timer state and elapsed duration

#### Scenario: GitHub is not connected

- GIVEN the user cannot use GitHub-backed task selection
- WHEN the timer page is used
- THEN the page offers a manual task input fallback

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own entries inline.

#### Scenario: Inline edit for a time entry

- GIVEN the user views their time entries list
- WHEN they choose to edit one entry
- THEN the edit interaction opens inline within the row
- AND the page does not require a modal for that edit flow

### Requirement: Profile Identity Surface

The profile page MUST expose editable profile information, GitHub connection state, and sign-out access.

#### Scenario: Profile page shows connection card

- GIVEN the user opens their profile page
- WHEN the page renders
- THEN it shows the editable display-name surface
- AND it shows the GitHub connection state card
- AND it provides a sign-out action

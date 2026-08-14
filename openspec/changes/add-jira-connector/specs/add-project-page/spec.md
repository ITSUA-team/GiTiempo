## ADDED Requirements

### Requirement: Add Project Imports A Jira Project

The Add Project page SHALL offer a Jira source when the admin has a connected Atlassian account and the workspace has an approved site. The flow MUST mirror the GitHub import's guarantees: the preview states what will be created, a Jira project already tracked by an active GiTiempo project is not addable, and the refusal names the tracking project.

#### Scenario: Jira source lists importable projects

- **GIVEN** an admin with a connected Atlassian account and an approved workspace site
- **WHEN** they set Source to the Jira import
- **THEN** the project field offers the site's Jira projects their account can read
- **AND** the derived project name comes from the Jira project

#### Scenario: A Jira project already tracked blocks the add

- **GIVEN** a Jira project an active GiTiempo project already tracks
- **WHEN** the admin selects it
- **THEN** the form reports which project tracks it
- **AND** the add action is unavailable

#### Scenario: Jira unavailability is explained

- **GIVEN** the admin has no Atlassian connection, or the workspace has no approved site
- **WHEN** they set Source to the Jira import
- **THEN** the page explains which is the case rather than presenting a failed request

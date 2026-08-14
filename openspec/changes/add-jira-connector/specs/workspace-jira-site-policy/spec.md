## ADDED Requirements

### Requirement: Workspace Jira Site Policy Exists

A workspace SHALL hold at most one approved Jira Cloud site, stored as the site's cloud id and hostname. Jira browsing and materialization MUST be scoped to the approved site, and its cloud id MUST come from the stored policy, never from a request.

#### Scenario: Admin approves a site

- **GIVEN** an admin with a connected Atlassian account
- **WHEN** they choose one of the sites their account can access as the workspace site
- **THEN** the workspace stores that site's cloud id and hostname
- **AND** subsequent Jira browsing runs against that site only

#### Scenario: The cloud id cannot be supplied by a caller

- **WHEN** any Jira request is processed
- **THEN** the backend resolves the cloud id from the stored workspace policy
- **AND** a cloud id carried in the request is refused rather than ignored

#### Scenario: No approved site explains itself

- **GIVEN** a workspace with no approved Jira site
- **WHEN** a member opens a Jira-dependent surface
- **THEN** the state explains that no site is approved yet
- **AND** it is not presented as a failed request

### Requirement: Jira Site Policy Is A Filter Only

Approving a site MUST NOT grant any member access they do not have on Jira. The policy narrows what GiTiempo shows; Atlassian permissions still decide what each account can read.

#### Scenario: Member without Jira access to the site

- **GIVEN** the workspace approved a site a member's Atlassian account cannot access
- **WHEN** that member browses Jira through GiTiempo
- **THEN** they see the access problem reported for their own account
- **AND** the policy does not widen or substitute their access

### Requirement: Changing The Site Does Not Rewrite History

Replacing the approved site MUST leave existing projects, tasks, and their Jira references untouched. Mappings to the previous site stop matching new work but remain stored.

#### Scenario: Admin replaces the approved site

- **GIVEN** projects tracked against the previously approved site
- **WHEN** the admin approves a different site
- **THEN** existing projects, tasks, and time entries are unchanged
- **AND** new browsing and materialization run against the new site only

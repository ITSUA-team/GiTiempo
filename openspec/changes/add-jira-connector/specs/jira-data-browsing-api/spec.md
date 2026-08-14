## ADDED Requirements

### Requirement: Connected Atlassian Account Required For Browsing

Jira browsing endpoints MUST require the caller's own connected Atlassian account and MUST report an unconnected or re-authorization-needed account as that state, not as empty data.

#### Scenario: Unconnected member browses Jira

- **WHEN** a member with no Atlassian connection calls a Jira browsing endpoint
- **THEN** the response identifies the missing connection
- **AND** no Jira request is attempted

#### Scenario: Connection needing re-authorization

- **GIVEN** a member whose connection was marked as needing re-authorization
- **WHEN** they call a Jira browsing endpoint
- **THEN** the response identifies the re-authorization state
- **AND** it is distinguishable from having no projects

### Requirement: Jira Projects Can Be Listed

A connected member SHALL be able to list the Jira projects of the approved site that their account can read, paginated with the same caps the GitHub browsing applies.

#### Scenario: Projects are listed

- **WHEN** a connected member lists Jira projects
- **THEN** the response contains projects from the approved site their account can read
- **AND** each project carries its immutable id, key, and name
- **AND** pagination is capped rather than unbounded

### Requirement: Jira Issues Can Be Listed By Project

A connected member SHALL be able to list open issues of a Jira project on the approved site, and the listing MUST expose what their account could not read rather than folding it into emptiness.

#### Scenario: Issues are listed

- **WHEN** a connected member lists issues of a Jira project
- **THEN** the response contains open issues their account can read, newest first
- **AND** each issue carries its immutable id, key, and summary

#### Scenario: Hidden issues are an access state

- **GIVEN** a project whose issues are hidden from the member by Jira permissions
- **WHEN** they list its issues
- **THEN** the response distinguishes "nothing exists" from "nothing readable"

### Requirement: Jira Browsing Is Read Only

Browsing MUST NOT create, modify, or transition anything on Jira.

#### Scenario: Browsing performs only reads

- **WHEN** any Jira browsing endpoint runs
- **THEN** only read requests are sent to Atlassian

### Requirement: Rate Limiting Surfaces As Retryable

An Atlassian rate-limit response MUST surface as a retryable error carrying that meaning, not as an empty list or a generic failure.

#### Scenario: Atlassian returns a rate limit

- **WHEN** a browsing request is rate limited by Atlassian
- **THEN** the caller receives a response identifying the rate limit
- **AND** no partial result is presented as complete

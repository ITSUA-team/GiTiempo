# ADR 004: Provider-Neutral Project and Task References

**Status:** Approved  
**Date:** 2026-04-28

## Context

The product starts with GitHub as the first integration for project and task discovery, especially for GitHub repository issues and Chrome Extension timer start flows. However, GitHub is not the product domain itself. The core domain is workspace project tracking, task tracking, time entries, reports, and invoices.

Embedding `github_*` fields directly in `projects` and `tasks` would make GitHub a permanent part of the core schema and public contracts. That would make future integrations such as Jira, Trello, or other issue trackers harder to add because each provider would either require new nullable columns or force provider-specific data into fields named after GitHub.

## Decision

Keep `projects` and `tasks` provider-neutral.

Provider-specific identity and sync metadata are stored in separate external reference tables:

- `project_external_refs` for provider objects that map to projects, such as GitHub repositories or GitHub Project V2 boards.
- `task_external_refs` for provider work items that map to tasks, such as GitHub issues.

External refs use a common shape:

- `provider`, e.g. `github`
- `external_type`, e.g. `repository`, `project_v2`, `issue`
- `external_id`, stored as a string to avoid JavaScript numeric precision issues
- `external_key`, a stable human-readable lookup key such as `owner/repo` or `owner/repo#123`
- `external_url`
- `metadata` for provider-specific fields
- `synced_at`

Project assignments are also provider-neutral. They link `pm` and `member` workspace users to visible projects. Admins have implicit access to all projects and do not need assignment rows. Assignments remain valid when a user changes between `pm` and `member`; role controls allowed actions, while assignment controls project visibility.

## Consequences

- Core `projects` and `tasks` tables remain stable as integrations are added.
- GitHub-specific fields are isolated to integration references and adapter code.
- Public project/task API responses can initially omit external refs and expose them later through integration-specific endpoints or expanded contracts.
- Provider lookups still remain efficient because refs have indexed `provider`, `external_type`, `external_id`, and `external_key` columns.
- Implementations must enforce consistency between refs and their core records, including workspace scoping.
- Queries that need provider data require joins to external ref tables instead of reading columns directly from `projects` or `tasks`.

# ADR 009: Managed GitHub Verification and External Reference Recording

**Status:** Approved
**Date:** 2026-09-25
**Updated:** 2026-10-13 — external-github-extension-tracking

## Context

ADR 003 uses a user-to-server GitHub App connection for each person's browsing and import. Managed GitHub projects use workspace-owned authority independent of that optional personal connection. Customers may withhold consent to install the App; recording a member-supplied issue reference therefore needs a separate local policy.

## Decision

- Keep ADR 003's personal connection for GitHub browsing and import.
- Require a verified GitHub App installation for starts against a managed GitHub mapping. A reference-start request resolves an existing issue mapping first, then its repository mapping; managed denials never fall back to external recording.
- A workspace administrator with OAuth `read:org` membership begins setup; GitHub decides whether a new App installation may be added. The server verifies the exact installation, configured App and organization identities, required permissions, workspace organization policy, and repository access before marking it usable. Personal App authorization and organization-owner role are not setup prerequisites.
- Store only installation metadata and status. The server creates short-lived installation tokens from the GitHub App ID and private key; it does not expose tokens or private keys to either web client or the extension.
- On every managed GitHub-backed start, resolve canonical issue and repository data with the verified installation, confirm the repository is in an allowed organization and still accessible, then require access to an existing mapped GiTiempo project. A task may be materialized inside that project; the flow never creates a project or a member assignment.
- Return stable error codes for assignment, installation, permission, organization, resource, mapping, and provider failures. Clients show the matching recovery path without suggesting that a personal GitHub reconnect will fix installation-backed tracking.
- Enable external-reference recording by default for active GiTiempo workspace members. It requires neither a linked personal GitHub account, App installation, organization approval, nor an admin toggle. The session selects the workspace; caller authority fields are rejected.
- Accept only repository, safe positive issue number, bounded plain-text title, and matching canonical HTTPS direct issue URL. External recording makes no GitHub API call and does not attest to GitHub access. Persist `external-reference` project mode and `user-supplied` provenance, with no synchronization timestamp.
- Atomically create private external projects/tasks/references with the first successful timer, or reuse hidden mappings. Share case-insensitive repository/issue identities within a workspace without overwriting existing titles, state, billable defaults, provenance, or history. No assignment or permanent access grant is added.
- Derive own-time visibility from existing entries, including a running entry: projects contain only exact tasks with the caller’s entries; totals and activity summaries are personal, members are empty, and assigned-member summary is null. Own-time access cannot mutate shared work or authorize reporting/export. Admin and separate explicit project grants retain their established scope.
- Saved external starts and manual moves require current exact-task authorization. Deleting/moving the last own entry removes derived visibility without deleting shared work; a fresh extension reference can restore it. Preserve global timer uniqueness and conditional owned stop/history.
- Repository import can reuse an external mapping while retaining its mode and history. Board import cannot steal it, including inactive mappings. Rename, transfer, conversion, merging, and automatic rebinding remain deferred.
- Stop remains authoritative for a timer the member owns even if a later GitHub-backed start fails.

## Consequences

- Workspace admins must maintain installation setup for managed tracking. External recording works without customer App consent and records unverified user-supplied context.
- Personal GitHub browsing and import continue to work without a workspace installation, and a personal connection is not a prerequisite for a GitHub-backed timer start.
- Installation lifecycle webhooks can disable an installation quickly after suspension, deletion, or permission changes.
- Existing manual projects, tasks, timers, and personal connection flows retain their behavior.

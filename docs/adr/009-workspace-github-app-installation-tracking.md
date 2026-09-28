# ADR 009: Workspace GitHub App Installation for Timer Starts

**Status:** Approved
**Date:** 2026-09-25

## Context

ADR 003 uses a user-to-server GitHub App connection for each person's browsing and import. A timer started from a GitHub issue needs a workspace-owned authority that is independent of that optional personal connection and can be revoked when an organization installation changes.

## Decision

- Keep ADR 003's personal connection for GitHub browsing and import.
- Require a verified GitHub App installation associated with the current workspace before starting a timer from a GitHub issue.
- A workspace administrator begins setup and GitHub confirms the installation; the server verifies installation identity, organization ownership, configured organization policy, and repository access before marking it usable.
- Store only installation metadata and status. The server creates short-lived installation tokens from the GitHub App ID and private key; it does not expose tokens or private keys to either web client or the extension.
- On every GitHub-backed start, resolve canonical issue and repository data with the verified installation, confirm the repository is in an allowed organization and still accessible, then require access to an existing mapped GiTiempo project. A task may be materialized inside that project; the flow never creates a project or a member assignment.
- Return stable error codes for assignment, installation, permission, organization, resource, mapping, and provider failures. Clients show the matching recovery path without suggesting that a personal GitHub reconnect will fix installation-backed tracking.
- Stop remains authoritative for a timer the member owns even if a later GitHub-backed start fails.

## Consequences

- Workspace admins must complete installation setup and maintain repository permission before GitHub-backed tracking is available.
- Personal GitHub browsing and import continue to work without a workspace installation, and a personal connection is not a prerequisite for a GitHub-backed timer start.
- Installation lifecycle webhooks can disable an installation quickly after suspension, deletion, or permission changes.
- Existing manual projects, tasks, timers, and personal connection flows retain their behavior.

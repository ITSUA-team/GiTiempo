## Context

GitHub browsing already exists as read-only backend API behavior. The backend stores GitHub token material server-side, applies the workspace GitHub organization allow-list to organization-scoped browsing, and exposes normalized repository issue responses. The user-web top-bar timer task picker already owns project/task selection, local task creation, and timer start/change/stop actions. The Projects page task dialog already owns normal task creation and update flows.

The missing product bridge is a safe issue-suggestion flow inside the existing task creation surfaces. A connected GitHub account is not sufficient by itself: organization-owned issues are available only when the connected account can access the organization and the current workspace allows that organization. The admin-web Settings page already owns allow-list management and recovery steps when GitHub App access is blocked.

Affected app instructions:
- `apps/user-web/AGENTS.md`: use the documented user UI requirements, PrimeVue controls, approved timer design constraints, and focused user-web verification.
- `apps/api/AGENTS.md`: preserve shared contract safety and OpenAPI behavior if backend contracts change.
- Root `AGENTS.md`: prefer root/Turbo commands when multiple workspaces are affected, but focused user-web commands are appropriate for frontend-only implementation.

## Goals / Non-Goals

**Goals:**

- Add GitHub issue suggestions to the existing user-web Projects task creation dialog and top-bar timer New task flow for GitHub-backed visible projects.
- Keep the local task picker usable when issue suggestions are unavailable, empty, blocked, or fail to load.
- Avoid noisy failing repository issue requests for organization owners that are not browseable in the current workspace.
- Reuse existing repository issue browsing and workspace organization policy behavior instead of adding a parallel provider integration.
- Preserve the read-only GitHub browsing boundary until the user explicitly creates a local task.

**Non-Goals:**

- Do not create local tasks automatically from every GitHub issue.
- Do not start timers directly from GitHub issue provider data without creating/selecting a local task.
- Do not add a new GitHub provider selector to the top-bar timer dialog.
- Do not bypass the workspace GitHub organization allow-list for convenience.
- Do not change GitHub App installation or organization approval mechanics; admin-web Settings remains the recovery path.

## Decisions

1. Use repository issue browsing as optional task-title suggestions.

   Task creation surfaces will load issues for visible projects whose source is GitHub and whose project name can be resolved to an `owner/repo` repository key. Suggestions appear in a dedicated `GitHub issue` dropdown that prefills the local task title. The main timer `Task` dropdown remains local-task-only and keeps `New task` as the last option.

   Alternative considered: call a timer-specific `start from GitHub issue` mutation from user-web. Rejected because browsing is read-only, the approved top-bar timer flow is local project/task based, and current task creation cannot safely attach provider metadata without a separate contract change.

2. Preflight issue suggestions with the browseable owner list.

   Before fetching `/github/repos/:owner/:repo/issues`, user-web will load `/github/owners?type=all` and verify the repository owner appears in the response. For organization owners, this response already includes workspace policy filtering; for personal owners, it includes the connected personal account. If the owner is absent, user-web clears suggestions and skips the repository issue request.

   Alternative considered: call repository issues directly and suppress 404/403 errors. Rejected because it creates avoidable failing requests, noisy logs/toasts, and a poor user experience when a workspace simply has not allowed the organization.

3. Keep proposal failures local and non-blocking.

   GitHub issue suggestion loading is enhancement data. Failures clear suggestions and may show local inline helper text, but they must not block existing project/task selection, normal task creation, new task creation, or timer actions.

   Alternative considered: treat GitHub proposal failures as task loading failures. Rejected because local tasks remain authoritative and available even when provider browsing is unavailable.

4. Keep admin recovery out of the timer dialog.

   The user-web dialogs can indicate that suggestions are unavailable, but the concrete install/approve/reconnect/retry path remains in admin-web Settings GitHub Workspace Access. This keeps member UI compact and avoids mixing admin-only workspace policy mutation into user-web.

   Alternative considered: add admin recovery links in user-web. Rejected because not every member is a workspace admin, and the existing admin Settings card already owns structured recovery for blocked GitHub App access.

## Risks / Trade-offs

- Repository key inference from project name can be wrong if GitHub-backed projects do not consistently use `owner/repo` names -> Keep the parser strict and skip suggestions when the project name is not a valid repository key.
- Owner list freshness can affect policy gating -> Fetch owner visibility directly for the preflight rather than trusting stale cached owner data before issue suggestion requests.
- Suggested issues do not carry provider metadata into the created local task -> Accept for this change; creating provider-linked tasks requires a separate contract and data-model change.
- Empty suggestions can mean no open issues, no GitHub connection, disallowed organization, or provider failure -> Keep these states non-blocking and avoid presenting empty issue suggestions as local task absence.
- Repeated owner preflight calls add small latency to the picker -> Limit suggestions to the selected GitHub-backed project and preserve local task rendering as the primary path.

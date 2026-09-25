# Workspace GitHub App Installations

GitHub-backed timer starts use a verified GitHub App installation associated with the workspace. This is separate from a member's personal GitHub connection: personal connection supports browsing and import, while an installation authorizes server-side issue verification for timer starts.

## Administrator setup

1. In `GitHub Workspace Access`, add an allowed workspace organization. Each row shows the organization login, `Allowed for this workspace`, and `Remove`. Once installation status loads successfully, `Install App` also appears beside `Remove` unless the organization already has a verified workspace association.
2. When that policy list loads, and after an organization is added, GiTiempo automatically considers every allowed organization with no saved installation association. This work runs in the background; existing toasts report outcomes, with no separate installations card or status labels.
3. For an eligible connected organization owner, the backend creates opaque one-time setup state and uses an App JWT to look up the configured App installation. When GitHub finds one, the client immediately submits `existingInstallationId` with that state to `POST /workspace/github/installations/complete`. The server validates the state, installation, organization-owner authority, and workspace organization policy.
4. A 404 means the App is not installed and leaves the association absent; GiTiempo does not redirect automatically to GitHub. A non-404 lookup failure also leaves the policy UI unchanged and is not treated as permission to install another App. Existing verified, suspended, unavailable, and locally disconnected associations are preserved rather than automatically retried or reactivated.
5. Click `Install App` to explicitly retry setup. If the App is already installed, GiTiempo verifies it directly without asking you to reinstall. If discovery returns 404, successful setup opens the configured App installation page in the current tab. Select the intended organization on GitHub; the return to Settings is accepted only after checking that installation against the initiating organization. Discovery or authority failures report an error without navigation.
6. The same button is available for saved suspended, unavailable, and locally disconnected associations. Repair access on GitHub when needed, then explicitly retry; only successful full verification restores the workspace association. A pending manual attempt shows loading and prevents additional Install App clicks. A verified association hides the action. A later Settings load retries missing associations only and never automatically restores a saved association.

Only workspace administrators may use these endpoints. Automatic confirmation requires the current admin to connect GitHub personally and be an active owner of the target GitHub organization so the server can prove installation ownership. That personal connection is an administrator setup prerequisite only; it is never a replacement for a missing, suspended, or unavailable installation at timer start. Reading status, locally disconnecting access, and removing policy do not need a personal GitHub connection.

## Setup error recovery

- `Reconnect GitHub, then retry installation verification` (HTTP 409): provider lookups succeeded, but the administrator's user token cannot access the exact installation. Reconnect GitHub from the user profile with the intended organization-owner account, then return to Settings and click `Install App` to create fresh setup state and verify the existing installation. This message does not prove that the token is stale or guarantee reconnection will resolve access; if it persists, check that the personal connection and installed App correspond to the configured GitHub App and that the account has organization access.
- `GitHub organization owner authority is required` (HTTP 403): setup cannot confirm active owner membership or the expected organization identity. At completion this message follows successful installation-access verification. Use a connected organization-owner account that is also a workspace administrator; installing an App alone does not satisfy this check.

Failed completion consumes its single-use state, so retry through `Install App` instead of replaying the callback URL. Both failures leave the previous association intact and grant no tracking access. These recovery instructions apply to administrator setup, not to members starting timers.

## Required application configuration

Production configuration requires `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_APP_WEBHOOK_SECRET`. The private key remains server-only and may contain literal `\\n` line breaks in environment configuration. Do not place it, an installation access token, or the webhook secret in an SPA, extension build, logs, or support material.

Grant the GitHub App the least privileges needed for this feature: read access to organization members, issues, and repository metadata, plus Organization projects read access when board mapping verification is enabled. Configure repository access to include every repository whose issues may start timers.

## Webhook and lifecycle operation

Set the GitHub App **Setup URL** to `${ADMIN_SPA_URL}/settings` (the deployed HTTPS Admin Settings URL). GitHub appends `state`, `installation_id`, and optionally `setup_action`. This is separate from the OAuth sign-in callback; never accept a caller-provided redirect URL.

Configure the GitHub App webhook to `POST /github/installations/webhook`. The API bootstrap preserves the raw request body; signature verification uses `GITHUB_APP_WEBHOOK_SECRET` before JSON parsing. Lifecycle deliveries are deduplicated by GitHub delivery ID and update the stored installation status, so a deleted, suspended, or inaccessible installation cannot remain usable.

Monitor failed webhook delivery and reverify requests. Do not manually mark an installation healthy after a lifecycle failure; reverify through the administrator endpoint after GitHub-side access has been repaired.

## Start-time enforcement and recovery

Each start request rechecks the installation, allowed organization, repository access, canonical GitHub identifiers, existing project mapping, and the member's project access. The server may materialize the issue as a task only inside that existing mapped project. It never auto-creates a project or assignment.

- Assignment failures use the exact message: `You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.`
- Installation, organization, or repository permission failures are resolved by a workspace administrator in GitHub and Admin Settings.
- Mapping failures are resolved by a workspace administrator or project manager by preparing the existing GiTiempo project mapping.
- Provider failures are retried after GitHub is available.

Do not roll back to user-to-server, personal tokens, or an administrator token as a production or UAT fallback. Rollback disables GitHub-backed starts by disconnecting or disabling the workspace installation; manual tracking, personal browsing, imports, and authoritative stopping of an already-running owned timer remain available.

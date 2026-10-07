## 1. Shared contracts and coordination

- [x] 1.1 Add strict shared schemas for installation setup/completion/status/reverification/disconnect and export credential-free response types.
- [x] 1.2 Define the tracking domain-error code schema and safe messages/statuses from the design, including the exact `project_assignment_required` message and no upstream-provider 401 leakage.
- [x] 1.3 Preserve the existing strict GitHub start request (`githubRepo`, `issueNumber`, optional `githubProjectId`) and time-entry response shape; add focused schema tests for forged credential/workspace/assignment fields.

## 2. API installation setup and credentials

- [x] 2.1 Add additive installation association and expiring setup-state storage/migrations with workspace/organization uniqueness, lifecycle state, verification metadata, and authorization version; leave existing allow-list entries unverified.
- [x] 2.2 Add validated server-only App ID/private-key/webhook configuration and an installation token provider with restricted scope, expiry skew, concurrent renewal coordination, bounded retry, and redacted failures.
- [x] 2.3 Implement setup-state initiation and atomic completion tied to current user/workspace/organization and fixed redirect; recheck active admin membership on completion.
- [x] 2.4 Verify the administrator's exact installation access, active organization-owner role, configured App identity, stable organization identity, non-suspended installation, and granted permissions before saving or replacing a link.
- [x] 2.5 Expose workspace-scoped status, reverify, replace, and local disconnect operations; preserve the previous verified link on failed replacement and permit status/disconnect without personal GitHub credentials.
- [x] 2.6 Add authenticated raw-body lifecycle webhooks with timing-safe signatures, delivery deduplication, repository access invalidation, and safe reconciliation of reordered events across API instances.
- [x] 2.7 Add focused setup/credential tests for wrong App/org/user/workspace, spoofed installation ID, installation access without owner authority, state replay/expiry, lost admin role, failed replacement, token renewal, permission loss, and secret exclusion.
- [x] 2.8 Add lifecycle tests for invalid signatures, duplicate/out-of-order deliveries, suspended/deleted installations, removed repositories, permission updates, and prevention of disconnected-link reactivation.

## 3. API timer resolution and authorization

- [x] 3.1 Route the shared GitHub start endpoint through workspace installation resource verification without personal-token fallback; preserve personal browsing/import services.
- [x] 3.2 Add an existing-only project resolver with canonical issue ownership first, repository second, then verified board mapping; support direct-page board-only resolution, optional verified hints, pagination, and missing/ambiguous mapping errors.
- [x] 3.3 Enforce active workspace membership and active project state; require ordinary-member assignment including public projects while preserving admin exemption and PM visibility-based access.
- [x] 3.4 Recheck local authorization, organization policy, installation authorization version, and canonical mapping at the write boundary, coordinating locks with membership/assignment/project changes.
- [x] 3.5 Remove project creation and automatic assignments from GitHub starts; materialize tasks only after authorization while preserving task state, billing defaults, `source: extension`, uniqueness, and rollback behavior.
- [x] 3.6 Map installation/resource/mapping/assignment failures into the shared safe error envelope before protected metadata or writes; keep owned stop and conditional-stop logic independent of GitHub.
- [x] 3.7 Cover public/private issue starts with absent, disconnected, and expired personal connections, exact assignment failure, public-project denial, inactive membership/project/task, closed tasks, admin/PM behavior, and billing defaults in focused API tests.
- [x] 3.8 Add API integration coverage for forged board/repository identifiers, board membership/permission verification, existing-task precedence across surfaces, case-insensitive deduplication, workspace isolation, and missing/ambiguous mappings.
- [x] 3.9 Add real-database concurrency/rollback coverage for revoked assignments during provider lookup, installation disconnect during start, simultaneous starts, existing running timers, no partial writes, and owned stop after GitHub access loss/outage.

## 4. Admin-web installation management

- [x] 4.1 Read frontend skills, relevant `docs/ui` guidance, and approved Settings design frames; record the parity checklist for installation status/setup states before UI implementation.
- [x] 4.2 Add schema-validated installation management calls and Settings state alongside the existing organization allow-list, clearly distinguishing policy from verified installation readiness.
- [x] 4.3 Wire link/reverify/replacement flow and local disconnect, including owner/permission recovery guidance and fixed setup return handling; keep saved status visible without a personal connection.
- [x] 4.4 Cover ready/missing/suspended/disconnected states, setup authority failures, safe callback handling, and disconnected-admin status/removal in focused frontend tests.

## 5. Chrome extension

- [x] 5.1 Read extension guidance and approved popup/injected-control frames; record a parity checklist for the added error states on direct issue pages and Projects panes.
- [x] 5.2 Remove any personal-connection gating for GitHub start, retain GiTiempo sign-in requirements, and ensure request context uses identifiers only with an optional verifiable board hint when supported.
- [x] 5.3 Preserve stable API error codes through extension API/runtime messaging and render the exact assignment message independently in popup and injected controls.
- [x] 5.4 Render distinct administrator installation/policy/permission remedies, project mapping remedies, and retryable provider failures without personal reconnection prompts or session loss.
- [x] 5.5 Keep owned-timer stop available during installation failure, retaining stable issue matching and conditional stop protection.
- [x] 5.6 Add extension tests for both UI surfaces, absent/disconnected/expired personal integration, assignment copy, installation versus mapping/provider errors, private issue context, no optimistic timer on denial, and stop after access loss.

## 6. User-web shared endpoint compatibility

- [x] 6.1 Update GitHub timer-start error handling and picker guidance for required installation access and existing mapped projects; keep personal browsing/import and ordinary local-task timer behavior intact.
- [x] 6.2 Verify the picker does not create projects/assignments to recover from a failed start and that imported boards remain distinct from repository projects.
- [x] 6.3 Cover assignment, missing installation, missing/ambiguous mapping, successful mapped-board start, and unaffected local-task/browsing flows in focused user-web tests.

## 7. Documentation and release

- [x] 7.1 Add an ADR superseding ADR-003's installation prohibition, explicitly retaining user-to-server browsing/import and separating GitHub sign-in from provider integration.
- [x] 7.2 Reconcile `docs/PROPOSAL.md`, `docs/ui/chrome-ext.md`, admin/user timer guidance, and existing auto-create claims with installation access and deliberate project setup.
- [x] 7.3 Document App permission approval, organization-owner setup, callback/webhook configuration, private-key handling, lifecycle recovery, and coordinated deployment/rollback without personal-token fallback.
- [x] 7.4 Regenerate `packages/shared/openapi.json` using the working export path documented in `apps/api/AGENTS.md`, and update relevant `bruno/` examples for installation setup and safe tracking failures.

## 8. Verification

- [x] 8.1 Validate the change with `pnpm exec openspec validate workspace-github-installation-tracking --strict` and check implementation against every issue #420 acceptance criterion.
- [x] 8.2 Run API lint/typecheck/unit tests and targeted real-Postgres e2e coverage following `apps/api/AGENTS.md`; use isolated test resources and migrations before dependent checks.
- [x] 8.3 Run extension typecheck, tests, and build; verify popup/injected assignment and recovery states against the approved design and supported GitHub surfaces.
- [x] 8.4 Run admin-web and user-web lint/typecheck and affected tests; if shared frontend leaves are changed, run both app suites required by repository guidance.
- [x] 8.5 Verify shared schema/OpenAPI agreement, absence of credentials in responses/logs/client bundles, and denied-start lack of task/time/assignment writes.
- [x] 8.6 Record release evidence for verified installation setup, an assigned member without personal GitHub integration tracking a private issue, lifecycle access loss, and successful owned timer stop; leave external-production setup to the authorized release process.

## 9. Existing-App automatic confirmation follow-up

- [x] 9.1 Restore the existing GitHub Workspace Access card without installation status, association-only rows, or a separate installations card; the later user-requested `Install App` action is recorded in section 10.
- [x] 9.2 On Settings policy load and successful organization add, discover and fully verify an already-installed App only for organizations with no association; never redirect automatically when App discovery returns 404.
- [x] 9.3 Preserve existing verified, suspended, unavailable, and locally disconnected associations without automatic reverify or reactivation; update UI guidance, change requirements, and parity notes.

## 10. Explicit installation setup and recovery follow-up

- [x] 10.1 Add `Install App` beside `Remove` only after successful status loading for organizations without a verified association, including saved non-verified states; show pending feedback and guard duplicate manual clicks.
- [x] 10.2 Reuse authenticated setup/completion for explicit clicks: verify an existing installation without reinstalling, otherwise navigate in the current tab with opaque state after successful discovery of absence; reject setup failures without navigation.
- [x] 10.3 Separate completion's missing user-token installation access (HTTP 409 reconnect guidance) from accessible-installation owner or organization-identity failures (HTTP 403); retain full authority checks and fresh state on retry.
- [x] 10.4 Reconcile proposal, design, installation and contract requirements, parity notes, and administrator documentation with the final button and recovery behavior.

Verification scope: these follow-ups have API lint/typecheck evidence and a prior manual button-navigation check. Successful organization installation, reconnection, and workspace confirmation have not yet been demonstrated end to end; earlier section 8 evidence does not establish those later scenarios.

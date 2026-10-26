# Proposal

## Why

[Issue #476](https://github.com/ITSUA-team/GiTiempo/issues/476): Google and GitHub sign-in currently reject people who do not already belong to a workspace. A successful social sign-in should give such a person a usable personal workspace automatically, including when their account already exists or has a pending team invitation.

## What Changes

- After verified Google or GitHub sign-in, provision a local user when needed, a workspace named exactly `Workspace`, default settings, an `admin` membership, and the normal workspace-scoped session when the account has zero memberships.
- Reuse the existing identity and existing memberships. Preserve deterministic workspace selection for users who already belong to any workspace; serialize provisioning so retries and concurrent sign-ins do not create duplicate workspaces.
- Treat Google and GitHub with the same verified email as one GiTiempo account only when that email is verified for both the incoming identity and the existing account. Bind additional verified Firebase subjects to that account; reject subjects already owned by another user without account merging or canonical UID replacement. A local email value, pending invitation, or creation reservation alone cannot prove existing-account ownership.
- Persist application-owned Firebase creation reservations for new GitHub/invitation identities so retries and invitation reuse can prove provenance. An arbitrary pre-existing Firebase email match cannot authorize adoption; require existing-provider proof when provenance or binding is missing.
- Persist a manual-registration reservation before Firebase creation, with an explicit UID and the validated display/workspace names but never a password. Reconcile a timeout, lost response, or process crash by that exact UID; completion of the application foundation requires authenticated control of that UID. Coordinate known-failure cleanup with identity adoption so it cannot delete an identity used by a concurrent flow.
- Create the personal workspace even when an invitation is pending. Leave invitations pending until explicitly accepted; ordinary sign-in does not join an existing team.
- Perform social provisioning automatically without a naming form or owner-confirmation step. Do not record owner acknowledgement or email consent based on social sign-in.
- Allow globally duplicate workspace display names for automatic creation, manual registration, and rename. Keep UUIDs as workspace identity and retain nonblank/length validation.
- **BREAKING**: retire the `workspace_name_unavailable` registration error and the normalized global workspace-name uniqueness policy. Update shared contracts and consumer mappings together.
- Extend GitHub's existing identity resolution and handoff flow to eligible accounts without memberships while preserving verified-email matching, immutable identity ownership, initiator proof, and OAuth/App separation.

## Capabilities

### New Capabilities

None. Extend the existing authentication and workspace capabilities.

### Modified Capabilities

- `auth`: permit automatic first-workspace provisioning on verified social sign-in; keep membership-bound tokens, refresh rejection, and non-social login behavior.
- `data-model`: preserve one canonical Firebase identity plus proven additional subjects per account and record recoverable, application-owned identity creation without granting application access.
- `github-signin`: resolve existing or new accounts safely and provision only after a valid handoff exchange; replace the unmatched-member rejection for eligible identities.
- `workspace-membership`: allow social provisioning before issuing a session while retaining membership as the application-access prerequisite.
- `workspace-management`: allow duplicate display names without affecting workspace identity or access control.
- `workspace-registration`: allow duplicate display names and guard failed-registration cleanup against concurrent identity adoption.
- `contracts`: remove the obsolete workspace-name conflict identifier from registration errors.
- `frontend-auth`: enter the normal authenticated workspace after automatic social provisioning without an additional form or consent inference.

## Impact

Multiple layers are affected: API authentication/GitHub/invite coordination, PostgreSQL schema and migration, shared registration errors, user-web error mapping, both web apps' session coverage, extension sign-in compatibility, and current product/API documentation. Authentication eligibility changes; successful login request/response shapes and JWT workspace claims remain compatible.

Implementation will touch the existing API auth/Firebase/GitHub account services, workspace schema, relevant tests, and the shared contract/client leaves identified in the design. No new dependency is required. Deploy removal of the database uniqueness constraint before enabling reusable default-name creation.

This explicitly supersedes current docs/specs that prohibit login provisioning or require globally unique workspace names. Historical archived decisions remain historical. Manual creation of additional workspaces for existing members remains [issue #480](https://github.com/ITSUA-team/GiTiempo/issues/480); no new workspace creation page is included here.

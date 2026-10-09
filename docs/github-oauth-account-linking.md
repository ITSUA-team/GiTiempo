# GitHub OAuth account linking

The existing OAuth App is reused for sign-in, linking from Profile and organization discovery. Keep `GITHUB_SIGNIN_CLIENT_ID`, `GITHUB_SIGNIN_CLIENT_SECRET` and the registered `${APP_URL}/auth/github/callback` unchanged. Both authorization starts request `user:email read:org read:project`, without `repo`. Existing authorizations need additional consent for scopes they did not grant. Scope requests are not proof of a grant: the API stores actual scope results, including inherited scope implications. OAuth access/refresh expiry is optional provider metadata; this change does not change the provider's expiry setting or add `offline_access`.

| Operation | Credential | Additional authorization |
| --- | --- | --- |
| Sign-in and authenticated account linking | OAuth App | Immutable identity, active existing member, initiator proof, global ownership |
| Organization discovery and adding workspace policy | OAuth `read:org` | Active membership; workspace admin for policy writes |
| Private repositories/issues/Projects browsing and imports | Personal GitHub App | Matching linked identity and existing workspace visibility policy |
| Installation discovery and setup | Personal GitHub App plus server App identity | Existing exact-installation and organization-owner checks |
| Installation-backed issue timer starts | Workspace App installation | Existing project, issue, organization, visibility and assignment checks |
| Owned timer stop | Existing GiTiempo session | Existing ownership rules |

Identity ownership is global across workspaces. Reauthorization for the same GitHub ID updates only its selected credential family. A GitHub ID owned by another GiTiempo user is rejected; changing an existing link to another ID requires full Disconnect first. OAuth-only identity does not grant private data or installation access. A migrated App-only identity can keep browsing but must authorize OAuth for organization discovery.

## Full personal Disconnect

The server checks Firebase's enabled user and password or Google provider eligibility again on DELETE. Email or client provider metadata alone is insufficient. An unavailable check blocks mutation with retry guidance. An already unlinked user receives idempotent cleanup without an unnecessary provider lookup.

Local unlink removes identity ownership and both encrypted personal grant families, releases the GitHub ID and advances a durable authorization generation/cutoff. Older callbacks, staged sign-in handoffs and delayed refresh results cannot restore the link. Logout also invalidates in-progress authorizations for that user; existing access-token semantics are unchanged. Current GiTiempo sessions, workspace installations/policy, imported projects/tasks, time history and owned timer stops survive unlink. A newly started and proven GitHub sign-in can recreate a link under the usual uniqueness/member-resolution rules.

Revocation uses each issuing client's token-specific endpoint with a bounded timeout. Local deletion is authoritative; provider failure produces `providerRevocation: unconfirmed`. No installation credential is revoked and no App is uninstalled. There is no delayed grant-wide revocation queue that could affect a new owner. This operation is not account deletion or immediate backup erasure.

## Migration and release

1. Run the read-only audit against the target environment: `pnpm --filter @gitiempo/api github:identity-preflight`. It reports active legacy ownership conflicts using internal IDs, without credentials, and lists every affected GiTiempo user. A duplicate group is an informational migration-cleanup finding, not a reason to select an owner: the migration will unlink every legacy personal GitHub binding for that immutable GitHub ID.
2. Verify the actual OAuth App token-expiry setting, unchanged callback and client identity, encryption key, and Firebase password/Google eligibility. Changing external configuration is a separate release action.
3. Quiesce the old API's GitHub authorization/callback writes, then apply additive migration `0020_strong_hitman.sql` after reviewing the audit. The migration transaction locks legacy connection/state writes and recomputes duplicate groups before cleanup/backfill. It backfills unambiguous active App identities without fabricating OAuth grants. For every duplicate active GitHub ID it removes all matching legacy personal App connection rows, including historical rows for that ID, invalidates affected pending legacy OAuth states, and seeds durable authorization generation/cutoff records. It does not revoke provider grants. Disconnected legacy rows do not reserve an identity. Keep installation tables and all GiTiempo users, sessions, memberships, workspace policy, projects, tasks and history. Resume GitHub writes only with the compatible API; an old callback must not recreate a cleared row after the migration commits.
4. Release compatible API and both SPAs together. The connection response adds mandatory OAuth/capability/eligibility fields; DELETE now returns HTTP 200 and the full-unlink result. Existing auth-URL and token-pair shapes remain unchanged. Preserve legacy App data flows and explain OAuth reauthorization to legacy users.
5. Complete the acceptance checklist in the OpenSpec change with dedicated test identities/organizations. Simulated provider outcomes supplement, and do not replace, live consent, private-data, installation and Chrome/Firefox acceptance checks.

Rollback preserves the additive tables and generation/cutoff records. Do not run an old identity-blind OAuth callback or Disconnect against the new storage, reinterpret one token family as another, or reconstruct links from cleared App rows. Duplicate-group cleanup is intentionally irreversible: rollback never restores legacy credentials or bindings. Affected users must explicitly relink GitHub and grant App data access again. Prefer rolling forward; if application rollback is necessary, temporarily disable GitHub authorization/link/unlink entry points at the deployment boundary until the compatible implementation is restored. Workspace installation tracking can retain its separate authorized path. Do not drop identity/grant/generation data as a rollback shortcut.

The one-minute encrypted sign-in handoff uses the existing single API instance memory store; abandoned entries are removed on expiry. Multiple API instances require a shared handoff store or reliable affinity as a separate infrastructure change. No such deployment change is included here.

## Related work

`prepare-chrome-web-store-privacy` owns published OAuth purpose and token-retention disclosures. This change records actual server behavior without claiming provider/backup deletion guarantees or policy publication. `require-project-assignment-for-saved-github-timers` owns saved-task assignment behavior; personal linking/disconnect does not repair assignment failures. See ADR 003 for retained personal data access and ADR 009 for installation tracking.

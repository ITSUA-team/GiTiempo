# Local release preflight — 2026-10-08

The initial audit reads the local database configured by `apps/api/.env` (localhost, port 5432). It is separate from the disposable acceptance database. Queries ran with `default_transaction_read_only=on` and a five-second statement timeout. No migration, credential decryption, provider revocation or data mutation was performed during that initial audit; the later explicitly authorized local migration is recorded below.

## Configuration availability

Presence-only inspection of `apps/api/.env` and the invoking process found:

| Setting | Local result |
| --- | --- |
| `GITHUB_SIGNIN_CLIENT_ID` | Not configured |
| `GITHUB_SIGNIN_CLIENT_SECRET` | Not configured |
| `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL` | Not configured |
| `GITHUB_SIGNIN_EXTENSION_FIREFOX_REDIRECT_URL` | Not configured |
| Personal GitHub App client ID/secret | Configured |

The retained App client cannot substitute for the agreed sign-in OAuth App. Live OAuth and Chrome/Firefox consent checks need the actual test-environment configuration and dedicated test sessions. No secret values were printed or saved in this evidence.

## Identity ownership audit

`pnpm --filter @gitiempo/api github:identity-preflight` exited **1** under the then-current implementation, which treated duplicate ownership as an unresolved release blocker:

- Active candidates: **2**.
- Disconnected/incomplete legacy rows excluded: **1**.
- Conflicting GitHub identities: **1**, with **2** distinct GiTiempo owners.
- New `github_account_links` storage is absent in this local database; migration 0020 has not been applied.

The conflict is GitHub `tsukanovoleksii` (immutable ID `143533474`). Both local users have the same display name and email. The audit is evidence of the two affected legacy bindings; it does not establish a future owner.

| GiTiempo user ID | Existing memberships | Existing personal App connection |
| --- | --- | --- |
| `4cc7ff72-d89d-44b1-8537-35d2276e5716` | Admin of `GI Tiempo`, `test`, `test1` | Active; last updated 2026-10-07 |
| `4d368781-2d95-4a18-898a-1b67f0347310` | Admin of `GI Tiempo` | Active; last updated 2026-05-15 |

## Updated resolution rule — automatic full unlink during migration

The user clarified the migration rule after this audit: if an immutable GitHub ID is actively bound to more than one GiTiempo user, migration removes **all** matching legacy personal App connection rows for that GitHub ID, including historical rows. It also invalidates the affected users' pending legacy OAuth states and seeds durable authorization generation/cutoff records. It does not select an owner, merge users, decrypt credentials, revoke provider grants or create an OAuth grant.

All GiTiempo users, sessions, memberships, workspace policy/installations, projects, tasks and history remain. Each affected user must explicitly relink GitHub and authorize personal App data after migration. The preflight stays read-only and will report the group and affected users as planned cleanup; under the updated implementation known duplicate groups are informational and do not cause a nonzero exit. This evidence records no current database mutation: migration 0020 has not been applied, and no provider grant has been revoked.

The updated read-only preflight was rerun and exited **0**. It reports the same two active owners and lists **three** `plannedUnlinkUserIds`: the two active owners above plus `90d0e2da-9ef3-466a-aa4c-da3eb8820a34`, whose already-disconnected legacy row shares the same GitHub ID. Migration will remove that historical row too, without deleting its GiTiempo user. This is a cleanup preview; it does not mean the migration or live OAuth acceptance has been performed.

## Authorized local migration applied

The user explicitly selected applying migration 0020 to the current local database. The migrator verified that `0020_strong_hitman` was the only pending migration and targeted `localhost:5432/gi_tiempo`. The compatible local API process was briefly paused around the transaction and resumed in `finally`; the migration completed successfully.

- Remaining legacy rows for GitHub ID `143533474`: **0**.
- Identity links for that duplicate ID: **0**.
- Fabricated OAuth grants: **0**.
- Affected generation/cutoff records: **3**, including the matching historical row.
- Remaining pending GitHub authorization states for those users: **0**.
- Before/after row counts and content digests of **17 non-GitHub public tables** matched exactly, including users, sessions, memberships and workspace/history data. No row content, tokens or provider secrets were printed.
- Post-migration read-only preflight exited **0** with no candidates, conflicts or planned cleanup.

This is local migration evidence, not live OAuth consent or production release acceptance. No provider grant was revoked. OAuth client configuration remains the prerequisite for real sign-in.

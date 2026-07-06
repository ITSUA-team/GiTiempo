## Context

The current auth migration introduces a non-null `workspace_id` on persisted refresh tokens. Legacy rows do not carry enough authoritative information to backfill that value safely, so the migration intentionally deletes existing refresh-token rows and forces users to authenticate again after deploy.

This branch behavior needs explicit OpenSpec coverage, but it is not yet canonical repository behavior. GiTiempo's OpenSpec workflow keeps accepted source-of-truth requirements under `openspec/specs/` and branch or active change behavior under `openspec/changes/` until the change is applied or archived. This change therefore carries both the deploy-facing forced logout delta and the auth-facing refresh-token workspace-binding delta.

## Goals / Non-Goals

**Goals:**

- Move the forced logout release note out of canonical deploy specs and into an active OpenSpec change.
- Define how deploy documentation and operators should treat a session-invalidating migration during rollout.
- Document the workspace-bound refresh-token semantics that make this migration necessary.
- Keep implementation-adjacent documentation and auth spec deltas aligned with the migration already committed on this branch.

**Non-Goals:**

- Do not introduce additional auth, refresh-token, or deploy runtime behavior beyond the workspace-bound refresh-token change already in this branch.
- Do not introduce a generic policy that every migration may invalidate sessions.
- Do not expand the change into broader auth or incident-management documentation.

## Decisions

1. Document this as deltas against `api-vps-docker-deploy` and `auth`.

   The forced logout behavior changes operator-facing deploy expectations, so it belongs in the existing deploy capability. The refresh-token membership binding changes persisted auth/session behavior, so it belongs in the existing auth capability. Both are captured as modified requirements in the branch-local change.

   Alternative considered: add the notes directly to canonical specs under `openspec/specs/`. Rejected because canonical specs in this repo represent accepted behavior after change application, not in-flight branch-specific release behavior.

2. Keep the migration SQL comment and deployment guide aligned with the active change.

   The SQL file should keep the intent note closest to the destructive step, and `docs/deployment.md` should warn operators before rollout. The OpenSpec change then explains why those two artifacts intentionally mention forced logout before canonical spec sync.

   Alternative considered: document the behavior only in the migration SQL comment. Rejected because the deploy risk is operational and needs a visible release/runbook note, not only an implementation-local comment.

3. Treat workspace-bound refresh tokens as part of this active change's documented branch behavior.

   This active change covers both the deploy-facing forced logout note and the implementation fact that persisted refresh tokens are now bound to a concrete `workspace_id`. That binding is the reason legacy rows cannot be upgraded in place, so the design and auth delta need to say so explicitly while the deploy delta records the rollout consequence.

   Alternative considered: keep the active change framed only as deploy documentation. Rejected because it understates the actual branch behavior and makes the deploy note look disconnected from the auth/data-model change that introduced it.

## Risks / Trade-offs

- [Risk] Operators could still miss the forced logout note if they skip the deployment guide. -> Mitigation: keep the SQL intent comment, deployment-guide note, and OpenSpec change aligned around the same release behavior.
- [Risk] A branch-local deploy note could be mistaken for permanent canonical policy. -> Mitigation: keep the requirement under `openspec/changes/...` until the team explicitly decides to apply or archive it.
- [Risk] Future auth migrations might cite this change too broadly. -> Mitigation: scope the requirement to migrations that intentionally invalidate persisted sessions because safe upgrade is not possible.

## Migration Plan

1. Keep the committed auth migration and its inline forced-logout intent comment.
2. Keep the deployment guide note that tells operators to communicate expected re-authentication before rollout.
3. Track the deploy and auth behavior as active OpenSpec deltas under `openspec/changes/clarify-session-invalidating-auth-deploy/`.
4. Apply or archive the change only if the team accepts this as lasting deploy and auth behavior rather than branch-local release guidance.

## Open Questions

- Should this remain a one-change release note, or does the team want to elevate it later into a permanent canonical deploy rule for all comparable migrations?

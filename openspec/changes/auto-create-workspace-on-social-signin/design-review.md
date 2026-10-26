# Design and security review

Review date: 2026-10-26. Branch: `feat/476-auto-create-workspace-on-social-signin`.

The user-approved timeout/recovery and two-sided verified-email rules are implemented. Independent security re-review approved the final recovery delta after the findings below were resolved. Real-provider/manual acceptance and unavailable repository-graph verification remain open; this change is not ready to archive.

## Approved identity policy

Email-only adoption requires verified ownership of the same normalized email on both incoming and existing identities. Existing proof comes from live verified canonical Firebase identity or a trusted persisted social binding. A local email, pending invitation, or creation reservation alone never supplies that proof. An unverified password account cannot be adopted by a different Google/GitHub subject merely sharing its email. Canonical subjects and immutable GitHub ownership remain stable; conflicts fail without merging.

The GitHub callback applies the proof gate before staging an existing-account candidate. Exchange rechecks identity ownership under the shared locks. Credentialless GitHub/invitation creation provenance proves only reuse of its exact reserved UID and does not authorize adoption of an unverified manual-registration identity.

## Approved registration recovery

Manual registration commits an explicit-UID reservation with original validated display/workspace names and acknowledgement intent before Firebase creation. It never persists the password. The provider wait is bounded; timeout, lost response, internal/network failure, and process interruption retain immutable provenance. A temporary absent-UID observation does not authorize expiry, recreation, or an unauthenticated credential change.

Later backend-verified authentication of the exact reserved UID revalidates live UID, normalized email, disabled state, reservation state, and local ownership under shared locks. It atomically completes the stored foundation or reuses a compatible existing membership. This narrow recovery can use an unverified password identity because it proves the exact reserved subject; it is not cross-account email adoption. Background late-result handling changes reservation status only and grants no session or local foundation.

## Findings resolved and independently re-reviewed

1. **Guarded compensation:** successful Firebase creation followed by SQL failure previously deleted outside identity locks. Compensation now locks email/UID, re-reads reservation and canonical/additional ownership, and deletes only an unadopted exact attempt. A bound or adopted identity is retained; unknown deletion keeps provenance.
2. **Live recovery recheck:** recovery previously checked Firebase before waiting for locks. It now rechecks after acquiring locks, before creating a foundation or session. A concurrently completed reservation reuses its committed membership and cannot create a missing replacement foundation.
3. **Ambiguous Firebase rejection:** classifying every adapter error as known non-creation could erase provenance after a lost response. Only the explicit deterministic rejection allowlist permits reservation cleanup; internal/network/unrecognized failures retain it for exact-UID recovery.

An unexpected returned UID is unproven ownership: the request fails closed, retains the requested reservation, logs a redacted operational warning, and never deletes the unexpected identity. An initial review suggestion to delete that UID was withdrawn as unsafe.

Fresh independent re-review found no remaining blocking issue in social email proof, GitHub handoff, invitation coordination, reservation recovery, or compensation. API unit regressions cover adopted/bound cleanup guards, locked live-state rejection, and unknown-error retention. Real PostgreSQL tests cover delayed success/rejection, ambiguous immediate rejection after remote creation, durable restart-like recovery, original input preservation, wrong-subject rejection, existing-foundation reuse, and migration preservation. See [verification-report.md](./verification-report.md) for final command results and limits.

## Remaining acceptance

Real Google/GitHub provider orders, browser profiles, and extension acceptance in section 8 remain pending. Automated fake-provider tests do not establish deployed Firebase configuration behavior. Requested repository graph tools are unavailable in this session; no re-index claim is made. The migration-first deployment and non-destructive rollback remain documented in [design.md](./design.md).

# Design and security review

Review date: 2026-10-26. Branch: `feat/476-auto-create-workspace-on-social-signin`.

The user-approved timeout/recovery and two-sided verified-email rules are implemented. Independent security re-review approved that recovery delta after the findings below were resolved. The additional paired Google ID-token proof approved on 2026-10-27 is also implemented and independently approved after the follow-up findings below were resolved. All implementation and agreed automated/manual acceptance tasks are complete (47/47), including the independently reviewed fresh local extension run. Graph re-indexing is conditional on available tooling and is N/A in this session, without a re-index or coverage claim.

## Approved paired Google proof amendment — 2026-10-27

The incoming Google email may be proven by an independently verified Google ID token only when its subject matches the single Google identity in the server-verified Firebase token. Enforce configured audiences/authorized party, signature, issuer, time and verified-email claims, conflict rejection and a live provider recheck under identity locks. Preserve two-sided account ownership, canonical identity and transactional binding/session guarantees. Do not infer verification from provider profile email or mutate Firebase metadata. Web and extension credentials stay in attempt memory; extension state, nonce and exact redirect checks are required. See design decision 3a for the full contract.

Independent review approved the backend and paired client transport after resolving repeated unknown-key JWKS refreshes with a global cooldown, adding cryptographic/JWKS tests, and correcting a type-only configuration import that broke Nest runtime injection. A real-provider Nest module regression protects that injection. The signature-corruption test fixture now flips an actual signature byte; five fresh focused runs passed. Twenty verifier tests, six new PostgreSQL HTTP cases, the complete unit suites and 407 API E2E tests passed. Google web entry and repeat entry with the real missing-email Firebase subject succeeded without another account/workspace; GitHub disconnect recognized that additional subject. The corrected paired-proof extension run subsequently passed, with independent acceptance review and SQL confirming original-account reuse.

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

Both same-email Google/GitHub provider orders and browser-profile concurrency are confirmed. The additional missing-email Google subject is now bound to the GitHub-founded account and recognized for disconnect. Chrome Google entry/reuse, equal-name workspace selection and cancellation/retry were verified before this amendment; the corrected paired-proof extension flow and real pre-disconnect stale-handoff checks subsequently passed. Fresh extension-first local provisioning subsequently passed in an isolated application database and received independent acceptance approval. Real-browser testing found that the existing admin-to-user redirect does not transfer the selected session across origins; per the user’s final decision, the fix is tracked separately in [#483](https://github.com/ITSUA-team/GiTiempo/issues/483) and is outside this implementation’s scope. Task 8.4 is complete for the verified provisioning, selection and existing app-local role-routing behavior; the transfer defect is not claimed fixed. Automated fake-provider tests do not replace the remaining deployed-provider checks. Requested repository graph tools are unavailable in this session; no re-index claim is made. The migration-first deployment and non-destructive rollback remain documented in [design.md](./design.md).


Final acceptance closeout: independent review approved fresh local extension-first provisioning for the existing verified Firebase Google identity, then approved 8.1 and the combined manual checklist 7.2. This follows the normative no-local-user/no-membership scenario and makes no new-Firebase-identity claim. All 47 tasks are complete; normal runtime/database were restored. The conditional graph substep remains N/A without a re-index/coverage claim. See [verification-report.md](./verification-report.md) and the final isolated-db evidence.

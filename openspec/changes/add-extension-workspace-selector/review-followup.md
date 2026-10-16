# Review follow-up plan

Scope: the seven justified changes accepted after the review of `f9fe5822`.

1. Add popup regressions for reconciliation failure followed by recovery, preserved switch rejection, and accessible membership loading before changing production code.
2. Give reconciliation errors their own lifecycle and retry action; clear them after successful reconciliation without hiding a rejected workspace switch.
3. Add API regressions for switch transport failure on the first request and after a 401 refresh, asserting session cleanup and no replay.
4. Add injected-control regressions for disabled Start and Stop while switching.
5. Add background regressions for rejected switch, concurrent switch re-entry, and mismatched final workspace. Assert the successful Start response in the existing ordering test.
6. Lock membership auth/reconciliation behavior, then remove the redundant initial authenticated snapshot and the unused membership request in the switch catch. Retain unauthenticated/recovery snapshots and final workspace validation.
7. Review the resulting diff independently; run extension tests, typecheck, lint, Chrome/Firefox builds, root checks, and strict OpenSpec validation. Compare the normal menu structure with the approved frames and report verification limits.

Keep changes within the extension and this change's documentation. No new dependencies, broad coordinator extraction, queue abstraction, or fixture normalization are needed.

The preceding independent review assessed the scope and tradeoffs; a separate reviewer will verify the final implementation.

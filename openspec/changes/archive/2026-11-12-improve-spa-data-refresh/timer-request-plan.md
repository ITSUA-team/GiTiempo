# Timer request coalescing follow-up

## Authorized scope

Reduce the repeated current-timer, project-visibility, and affected-project task
reads observed in the previous start/stop traces. Keep authoritative focus and
conflict recovery, the direct-list stop preflight, own-time access checks,
workspace isolation, and existing notifications. No API or visual change.

## Cleanup plan and boundaries

1. Add failing active-consumer request-count regressions before production edits.
   Include start/stop, a pending pre-mutation read, permission loss, and a pending
   request during a workspace change. Preserve the direct-stop race guard.
2. Give current timer one scoped query owner and derive top-bar presentation
   from its result. Reuse existing scoped project/task query data only when it
   can satisfy the current authority generation; coalesce required fresh reads.
3. Keep the existing eligibility rules for active visible projects and open
   active tasks. Never let a read started before a mutation satisfy its required
   post-mutation revalidation. Use existing QueryClient coordination and no new
   dependencies or module-level request cache.
4. Run focused regressions, the normal checks, independent review, and actual
   browser start/stop flows at desktop/mobile widths. Record comparable request
   counts and any remaining acceptance gap.

Only timer/query data ownership and corresponding tests/docs are in scope.
The existing page composition, selectors, fields, action order, responsive
branches, and success/error feedback form the parity checklist. Existing
implementation changes in this checkout must be preserved.

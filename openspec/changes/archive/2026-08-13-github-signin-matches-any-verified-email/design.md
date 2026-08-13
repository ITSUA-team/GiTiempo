## Context

`fetchVerifiedPrimaryEmail` asks GitHub for `/user/emails` and keeps the single entry where `primary` and `verified` are both true. Everything else in the response is thrown away, including the work address that would have matched. The `user:email` scope already returns the full list, so no scope change is needed to use it.

The refusal happens late. The callback creates a handoff carrying the email, and only when the SPA redeems it does `createSessionForVerifiedEmail` discover that nothing matches and raise an opaque 401. By then the browser has already left the login page, and the flow has no indicator to explain itself with.

The callback does have a way to explain failures: it redirects to the login page with a `githubError` indicator, which each surface turns into copy. That mechanism is already used for a missing verified email and for a bad state. It just is not reachable from the place where member matching fails.

## Goals / Non-Goals

**Goals:**

- A member signs in when any verified email on their GitHub account matches their GiTiempo account.
- A member who cannot sign in is told why, and what to do about it.
- An unverified address never authenticates anyone.
- The wrong account is never entered.

**Non-Goals:**

- Provisioning. Sign-in still refuses anyone who is not already a member with an active membership.
- Choosing between accounts when more than one matches. That is refused here, and a picker is a separate change.
- Reading `github_connections`. Sign-in stays independent of the GitHub App integration.
- Any database migration or shared contract change.

## Decisions

### Match on any verified email, never on an unverified one

Verification is what makes an address evidence of anything: GitHub lets anyone add any address, and only the verification step proves control. Primary is a display preference, not a security property, and using it as the sole identifier is what breaks the common case. Every verified address on the account gets to match; unverified ones are ignored entirely.

*Alternative considered:* keep primary matching and ask members to change their GitHub primary address. Rejected — it changes commit attribution and notification routing on their GitHub account to work around a limitation in ours, and it breaks again the next time someone reorders their addresses.

### Resolve the member in the callback, not in the exchange

Matching moves to where the flow can still redirect with an indicator. The handoff then carries the resolved member rather than an email, and the exchange becomes a lookup that cannot fail for identity reasons.

This is what makes the improved message possible at all: the exchange happens after the browser has already been sent to the SPA, so a failure discovered there has nowhere useful to surface.

*Alternative considered:* keep resolution in the exchange and return a typed error body. Rejected — the exchange is deliberately opaque so that a leaked or replayed handoff reveals nothing, and adding reasons to it would trade that away for a message the callback can deliver better.

### The primary address breaks a tie, and nothing else does

Two verified addresses on one GitHub account can belong to two different GiTiempo members. The primary address is the one the account holder has designated as their main identity on GitHub, which makes it the one deliberate signal available — unlike list order or recency, which are accidents of storage. When it resolves to one of the matched members, that member is signed in.

It is a tie-break, not a priority: the primary address is never consulted while a single member matches, so widening the match set still does the work. When the primary address resolves no member, or resolves one outside the match set, the flow refuses with its own indicator rather than falling back to another ordering.

*Alternative considered:* refuse on any ambiguity. Safer in the abstract, but it turns the ordinary case — a personal primary plus a work address, both registered — into a dead end, and the signal to resolve it correctly is right there.

*Alternative considered:* let the member pick. It is still the better end state for the cases the tie-break cannot settle, and it remains an open question, but it needs a two-step exchange, a shared contract union, and a chooser in three surfaces.

### The failure copy names the cause and links to GitHub

"Unauthorized" gives a member nothing to act on. The no-match copy says that no GiTiempo account matches any verified email on their GitHub account, and links to `https://github.com/settings/emails`, which is where the fix is. The ambiguous case gets its own copy, because the action there is different — sign in with email instead.

### Telling the member their addresses do not match is not a disclosure

The indicator only ever reaches someone who has just completed an OAuth round trip against that GitHub account, and it speaks only about addresses on that account. It reveals whether the member's own addresses are registered here, which is precisely what they are asking.

## Risks / Trade-offs

- **A shared or stale verified address matches an unintended member** → Matching requires verification, and verification requires control of the mailbox at the time it was added. A member who no longer controls an address should remove it from GitHub; this is the same trust model the primary-email path already relied on, applied to more addresses.

- **Widening the match set widens who can sign in** → Only to addresses the same GitHub account has already proved control of, and only to members who already exist with an active membership. No new account is reachable that the member could not already reach by making that address primary.

- **The ambiguous case is a dead end for the member** → Accepted, and the copy says what to do instead. It is reachable only by a member with two GiTiempo accounts whose addresses are both verified on one GitHub account.

- **Moving resolution earlier changes what the callback can fail with** → The existing indicators keep their meaning and the new ones are additive, so a surface that does not yet recognise an indicator falls back to its generic sign-in failure rather than breaking.

## Migration Plan

No database migration and no shared contract change. Rollback is reverting the API: the narrower primary-only matching is a subset of the new behaviour, so nothing signed in under the new rule becomes invalid.

The web apps and the extension can deploy independently. Until they carry the new copy, the new indicators render as the generic sign-in failure, which is what they show today.

## Open Questions

- Should the ambiguous case eventually offer an account chooser rather than a refusal, and if so, does the same choice belong in the extension popup?
- Should a member's GitHub connection, when one exists, take priority over email matching entirely — making the address irrelevant rather than merely more forgiving?

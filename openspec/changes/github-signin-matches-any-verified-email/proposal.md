## Why

GitHub sign-in matches a member against one address: the email GitHub reports as **primary**. A member whose GitHub account is personal cannot sign in, because their work address — the one their GiTiempo account uses — is on the same GitHub account but is not the primary one. GitHub already tells us about it: `/user/emails` returns every address with its verification state, and the flow discards all but one.

The refusal is also unhelpful. It arrives as an opaque 401 that says nothing, so a member has no way to learn that the fix is to add their work address to GitHub.

## What Changes

- Member resolution considers **every verified** email on the GitHub account instead of only the primary one. An unverified address never matches.
- Member resolution moves into the callback, before the handoff is created, so a failure can be explained instead of surfacing later as an opaque 401.
- A failure to match returns a distinguishable indicator, and the login surfaces turn it into copy that names the cause and links to `https://github.com/settings/emails`.
- When several verified emails match several different members, sign-in is refused with its own indicator and copy. No account is entered and no guess is made.
- The existing checks are unchanged: the member must already exist with an active membership, and no user is ever provisioned.

## Capabilities

### New Capabilities

None. This widens existing matching and improves its failure reporting.

### Modified Capabilities

- `github-signin`: matching widens from the primary verified email to any verified email, resolution moves into the callback, and two new failure indicators are defined with the copy the login pages show.
- `chrome-extension`: the popup names the new failure causes in its recoverable sign-in copy.

## Impact

- `apps/api/src/auth/services/auth-github.service.ts` — fetch every verified email rather than the primary one, resolve the member during the callback, and emit the new error indicators.
- `apps/api/src/auth/services/auth.service.ts` — resolve a member from a set of candidate emails, and mint the session from the resolved member.
- `apps/user-web`, `apps/admin-web` — login page copy for the two new indicators, including the GitHub email settings link.
- `apps/chrome-ext` — popup copy for the same indicators.
- No shared contract change: the exchange still returns a token pair or fails.
- No database migration.

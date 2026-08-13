## 1. Backend member resolution

- [x] 1.1 Replace the primary-only email fetch with one that returns every verified email on the GitHub account, discarding unverified entries
- [x] 1.2 Add member resolution from a set of candidate emails, returning the members that exist with an active membership
- [x] 1.3 Add session creation from an already-resolved member, reusing the existing Firebase UID, so it mints a session identical to the current email path

## 2. Backend callback and handoff

- [x] 2.1 Resolve the member inside the callback, before the handoff is created
- [x] 2.2 Redirect with a no-member error indicator when no verified email matches, issuing no handoff
- [x] 2.3 Redirect with an ambiguous-account error indicator when more than one member matches, issuing no handoff
- [x] 2.4 Keep the existing email error indicator for an account with no verified email at all
- [x] 2.5 Carry the resolved member in the handoff instead of an email, keeping its expiry, single use, and initiator binding unchanged
- [x] 2.6 Reduce the exchange to redeeming a handoff for its resolved member, so it can no longer fail for identity reasons

## 3. Backend tests

- [x] 3.1 Test that a verified non-primary email signs the member in
- [x] 3.2 Test that an unverified email matching a member does not sign anyone in
- [x] 3.3 Test that no match redirects with the no-member indicator and issues no handoff
- [x] 3.4 Test that the primary address breaks a tie, that it is not consulted for a single match, and that an unusable primary redirects with the ambiguous indicator
- [x] 3.5 Test that the exchange still refuses an expired, reused, or wrongly bound handoff
- [ ] 3.6 Extend the auth e2e coverage for the widened match and both new indicators

## 4. Web apps

- [x] 4.1 Add user-web login copy for the no-member indicator, linking to `https://github.com/settings/emails`
- [x] 4.2 Add user-web login copy for the ambiguous-account indicator, directing to email sign-in
- [x] 4.3 Mirror both in admin-web
- [x] 4.4 Confirm an unrecognised indicator still falls back to the generic recoverable failure copy
- [x] 4.5 Test both new indicators render their copy and leave no session stored

## 5. Extension

- [x] 5.1 Add popup copy for the no-member indicator, naming the GitHub email settings page
- [x] 5.2 Add popup copy for the ambiguous-account indicator
- [x] 5.3 Test both indicators surface as recoverable failures with no session stored

## 6. Verification

- [x] 6.1 Run typecheck, lint, and tests for `apps/api`, `apps/user-web`, `apps/admin-web`, and `apps/chrome-ext`
- [x] 6.2 Confirm no shared contract and no database migration were introduced
- [x] 6.3 Confirm a member whose primary GitHub email already matched signs in exactly as before

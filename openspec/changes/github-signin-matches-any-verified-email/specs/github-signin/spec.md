## MODIFIED Requirements

### Requirement: GitHub Sign-In Authenticates Existing Members By Verified Email

The backend MUST establish the session by matching an existing member with an active membership against **any verified** email on the authorizing GitHub account, and MUST reuse that member's existing Firebase UID. An unverified email MUST NOT match. It MUST resolve the member during the callback, before the handoff is created, so that a failure to match is reported as an error indicator rather than an opaque exchange rejection. It MUST NOT provision new users, and MUST NOT change the database schema, the JWT contract, or use Firebase Admin.

#### Scenario: Non-primary verified email signs in

- **WHEN** a verified email on the GitHub account matches an existing member with an active membership
- **THEN** the backend issues the normal session for that member, reusing their existing Firebase UID
- **AND** it does so whether or not that email is the account's primary address

#### Scenario: Unverified email never matches

- **WHEN** an email on the GitHub account matches an existing member but is not verified
- **THEN** it is ignored during resolution
- **AND** it alone cannot produce a session

#### Scenario: No verified email matches a member

- **WHEN** no verified email on the GitHub account matches an existing member with an active membership
- **THEN** the callback redirects to the login page with a no-member error indicator
- **AND** no handoff code is issued and no user is created

#### Scenario: No verified email at all

- **WHEN** the GitHub account has no verified email
- **THEN** the callback redirects to the login page with an email error indicator and no session is created

#### Scenario: Resolution happens before the handoff

- **WHEN** the handoff code is redeemed
- **THEN** it identifies an already-resolved member
- **AND** the exchange cannot fail because no member matched

## ADDED Requirements

### Requirement: Unmatched GitHub Sign-In Explains Itself

When GitHub sign-in cannot resolve a member, the login surfaces MUST show copy that names the cause and points at the action that fixes it, rather than a generic authorization failure. The no-member case MUST link to the GitHub email settings page at `https://github.com/settings/emails`.

#### Scenario: No-member copy names the cause and links to GitHub

- **WHEN** a login surface receives the no-member error indicator
- **THEN** it explains that no GiTiempo account matches any verified email on the GitHub account
- **AND** it offers a link to `https://github.com/settings/emails` so the member can add and verify their work address
- **AND** the member can retry sign-in from the same state

#### Scenario: Unrecognised indicator falls back to generic copy

- **WHEN** a login surface receives an error indicator it does not recognise
- **THEN** it shows its generic recoverable sign-in failure copy
- **AND** it does not present the attempt as a successful sign-in

### Requirement: Ambiguous GitHub Sign-In Is Refused

When more than one member with an active membership matches the verified emails on a single GitHub account, the backend MUST refuse the sign-in and MUST NOT select a member by any ordering or heuristic. The login surfaces MUST explain the refusal and direct the member to sign in with their email address instead.

#### Scenario: Several matching members refuse the sign-in

- **WHEN** the verified emails on the GitHub account match more than one member with an active membership
- **THEN** the callback redirects to the login page with an ambiguous-account error indicator
- **AND** no handoff code is issued and no session is created

#### Scenario: Ambiguous copy directs to email sign-in

- **WHEN** a login surface receives the ambiguous-account error indicator
- **THEN** it explains that the GitHub account matches more than one GiTiempo account
- **AND** it directs the member to sign in with their email address instead

#### Scenario: Primary address does not break the tie

- **WHEN** more than one member matches and one of the matching emails is the account's primary address
- **THEN** the sign-in is still refused
- **AND** the primary address carries no precedence in resolution

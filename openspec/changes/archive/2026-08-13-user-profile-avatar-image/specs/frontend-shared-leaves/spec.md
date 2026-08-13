## ADDED Requirements

### Requirement: Shared Header Accepts Member Avatar As Prop-Driven Input

The shared authenticated header SHALL accept the member's avatar image as optional prop-driven input alongside the existing initials input, and MUST NOT read auth stores or fetch profile data to obtain it. Consuming app shells continue to own auth-store reads.

#### Scenario: Shared header receives the avatar from the consuming shell

- **WHEN** `user-web` or `admin-web` renders the shared authenticated header for a member with a stored avatar
- **THEN** the app shell supplies the avatar image to the shared header as a prop
- **AND** the shared header renders it in the profile trigger
- **AND** the shared header does not import app auth stores or current-user clients to resolve it

#### Scenario: Shared header stays usable without an avatar input

- **WHEN** a consuming shell renders the shared authenticated header without supplying an avatar
- **THEN** the header renders the initials trigger exactly as before
- **AND** the avatar input remains optional for consumers

#### Scenario: Avatar image failure handling is shared rather than duplicated

- **WHEN** more than one frontend surface renders a member avatar image with an initials fallback
- **THEN** the fallback rule is provided by a shared browser helper rather than reimplemented per surface
- **AND** each surface keeps its own PrimeVue styling and sizing

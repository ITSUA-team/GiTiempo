## ADDED Requirements

### Requirement: User-Web Route Views Load On Demand
The user-web router SHALL load non-entry route view components on demand while keeping the public login entry and authenticated shell immediately available.

#### Scenario: User-web non-entry route views are lazy
- **WHEN** the user-web router module is initialized
- **THEN** the public login route is available without a lazy route component loader
- **AND** the authenticated shell route is available without a lazy route component loader
- **AND** dashboard, time entries, Projects list, profile, invite accept, invite password setup, 403, and 404 route views are configured as lazy route components that resolve only when their route is visited

#### Scenario: User-web lazy routes preserve navigation behavior
- **WHEN** navigation targets a user-web lazy route after auth bootstrap allows the route
- **THEN** the router resolves the lazy route component and completes navigation to the same route name, path, and metadata defined by the existing route inventory
- **AND** guest-only login redirects, protected-route redirects, invite guest-flow access, authenticated shell ownership, and standalone 403/404 behavior remain unchanged

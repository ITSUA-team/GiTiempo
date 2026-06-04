## ADDED Requirements

### Requirement: Admin Route Views Load On Demand
The admin-web router SHALL load route view components other than the primary public login entry and authenticated admin shell on demand.

#### Scenario: Admin non-login route views are lazy
- **WHEN** the admin-web router module is initialized
- **THEN** the public login route is available without a lazy route component loader
- **AND** the authenticated admin shell route is available without a lazy route component loader
- **AND** dashboard, reports, invoices, members, projects, add-project, settings, 403, and 404 route views are configured as lazy route components that resolve only when their route is visited

#### Scenario: Admin lazy routes preserve navigation behavior
- **WHEN** navigation targets an admin-web lazy route after auth bootstrap allows the route
- **THEN** the router resolves the lazy route component and completes navigation to the same route name, path, and metadata defined by the existing route inventory
- **AND** guest-only login redirects, protected-route redirects, authenticated admin shell ownership, standalone 403/404 behavior, and valid preserved redirect handling remain unchanged

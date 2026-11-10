# Delta: admin-routing

## Added Requirements

### Requirement: Invoice Routes Guarded By PM Invoice View Permission

The `/invoices` and `/invoices/:id` routes SHALL be guarded by a `requiresInvoiceViewPermission` meta flag. A PM user with `canViewInvoices = false` navigating to either route is redirected to the forbidden page. Admins and PMs with `canViewInvoices = true` are allowed.

#### Scenario: PM without permission redirected from invoices

- **GIVEN** a PM with `canViewInvoices = false` is authenticated
- **WHEN** the PM navigates to `/invoices`
- **THEN** the router redirects to the forbidden route

#### Scenario: PM without permission redirected from invoice detail

- **GIVEN** a PM with `canViewInvoices = false` is authenticated
- **WHEN** the PM navigates to `/invoices/:id`
- **THEN** the router redirects to the forbidden route

#### Scenario: PM with permission allowed to invoices

- **GIVEN** a PM with `canViewInvoices = true` is authenticated
- **WHEN** the PM navigates to `/invoices`
- **THEN** the invoices route renders normally

#### Scenario: Admin always allowed to invoices

- **GIVEN** an admin is authenticated
- **WHEN** the admin navigates to `/invoices`
- **THEN** the invoices route renders normally regardless of `canViewInvoices` value

### Requirement: Invoices Nav Item Hidden For PMs Without Permission

The invoices navigation item SHALL be hidden from the sidebar and mobile bottom navigation for PM users with `canViewInvoices = false`. Admins and PMs with `canViewInvoices = true` see the nav item as usual.

#### Scenario: PM without permission does not see invoices nav item

- **GIVEN** a PM with `canViewInvoices = false` is authenticated
- **WHEN** the admin shell renders the navigation
- **THEN** no invoices navigation link is rendered in the sidebar or mobile bottom navigation

#### Scenario: PM with permission sees invoices nav item

- **GIVEN** a PM with `canViewInvoices = true` is authenticated
- **WHEN** the admin shell renders the navigation
- **THEN** the invoices navigation link is rendered in the sidebar and mobile bottom navigation

### Requirement: Revoked Invoice Permission Closes Open Invoice Page

When a PM's `canViewInvoices` permission is revoked while the invoices page is open, the page SHALL redirect away on the next authorization refresh. The authorization context refresh SHALL detect `canViewInvoices` changes and treat them as an authorization change. On window focus and workspace switch, if the current route requires invoice view permission and the PM no longer has it, the user is redirected to the forbidden page (on focus) or dashboard (on workspace switch).

#### Scenario: PM on invoices page redirected to forbidden when permission revoked on focus

- **GIVEN** a PM with `canViewInvoices = true` is on `/invoices`
- **WHEN** the window regains focus and the authorization refresh detects `canViewInvoices` changed to `false`
- **THEN** the router redirects to the forbidden route

#### Scenario: PM on invoices page redirected to dashboard when switching to workspace without permission

- **GIVEN** a PM with `canViewInvoices = true` is on `/invoices`
- **WHEN** the PM switches to a workspace where `canViewInvoices = false`
- **THEN** the router redirects to the dashboard route
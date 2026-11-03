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
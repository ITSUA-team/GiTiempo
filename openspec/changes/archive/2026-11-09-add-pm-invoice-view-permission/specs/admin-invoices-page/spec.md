# Delta: admin-invoices-page

## Added Requirements

### Requirement: Invoice Defaults Loaded From PM-Accessible Endpoint

The invoices page SHALL load currency, default hourly rate, and rounding-step defaults from `GET /invoices/defaults` instead of `GET /workspace/settings`. This endpoint is accessible to both admin and PM users, eliminating the 403 Forbidden error previously shown to PMs.

#### Scenario: PM navigates to invoices without 403 toast

- **GIVEN** a PM with `canViewInvoices = true` is authenticated
- **WHEN** the PM navigates to `/invoices`
- **THEN** the page loads invoice defaults from `GET /invoices/defaults`
- **AND** no `GET /workspace/settings` request is made
- **AND** no 403 Forbidden error toast is displayed

#### Scenario: Admin navigates to invoices using defaults endpoint

- **GIVEN** an admin is authenticated
- **WHEN** the admin navigates to `/invoices`
- **THEN** the page loads invoice defaults from `GET /invoices/defaults`
- **AND** the create dialog pre-fills currency and hourly rate from the response

#### Scenario: Invoice defaults load failure shows error

- **GIVEN** the invoices page is loading
- **WHEN** the `GET /invoices/defaults` request fails
- **THEN** an error toast is shown with the failure message
- **AND** the create dialog falls back to null defaults
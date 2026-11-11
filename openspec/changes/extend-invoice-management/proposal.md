# Extend invoice management

## Why

Teams need to correct invoices after sending them, reuse client and payment details, and download a document a customer can pay. The current workflow locks billing inputs after creation and provides no personal grouping within the invoices each user can access. [Issue #527](https://github.com/ITSUA-team/GiTiempo/issues/527) and the invoice and settings screens in `GITiempo.pen` define the replacement workflow.

## What Changes

- Select Draft, Sent, or Paid in either direction. Edit billing fields, parties, payment details, notes, and included entries in any status. Preview totals and save the complete revision atomically.
- Store reusable workspace sender and payment defaults, including an optional logo. Capture the values used on each invoice and allow individual overrides.
- Create an independent draft from an accessible invoice after reviewing its period, personal group, and eligible entries.
- Download a paginated PDF from the saved invoice, including issuer, recipient, services, charges, and payment instructions.
- Organize accessible invoices into flat personal groups with counts, scoped search and filters, and single or bulk moves on desktop and mobile.

## Capabilities

### New Capabilities

- `personal-invoice-groups` — owner-scoped workspace groups, membership and authorized counts.

### Modified Capabilities

- `invoices-api` — reversible status, full revision and preview, defaults, reuse and PDF download.
- `data-model` — persistent invoice references, billing snapshots, entry associations and personal organization.
- `contracts` — compatible create/update, preview, defaults, response and group contracts.
- `admin-invoices-page` — lists, actions, editor, copy workflow, PDF and responsive recovery states.
- `admin-settings-page` — workspace sender, logo and payment defaults.

## Impact

Affects the NestJS API and PostgreSQL schema, shared Zod and OpenAPI contracts, and the Admin SPA. Existing clients and invoices need a compatible migration. Preserve authentication, workspace and PM project scoping, single billing per entry, and Admin-only draft deletion. Update the product, API, data model and Admin UI documentation alongside implementation.

## Acceptance criteria

- [ ] Manual acceptance testing passes in the running Admin SPA on desktop and mobile (below 640 px), using an Admin and an authorized PM. Record the build, roles, viewport and result for each workflow in #527 or its PR. Fix and manually retest failed scenarios before acceptance. Use the manual scenarios in section 4 of [tasks.md](tasks.md).

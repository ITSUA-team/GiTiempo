# Choose how invoices show billed time

## Why

Customers paying for a task may receive many lines for that task when several people log time over several days. Teams need a shorter invoice while retaining control of the individual time entries they bill.

## What Changes

- Add a **Show time by** choice to invoice creation and editing. **Time entry** preserves the current itemization. **Task** combines included entries into one line per task in saved invoice details and the exported PDF.
- Keep individual entries selectable when grouped. Switching views preserves exclusions, billed time, discounts and totals.
- Save the choice on each invoice. Default new and historical invoices to **Time entry** and start a draft made from another invoice with its source's choice.
- Update the desktop and mobile invoice editor and detail designs and the A4 invoice in `GITiempo.pen`.

## Capabilities

### Modified Capabilities

- `admin-invoices-page` — display controls, selection and task summaries in the editor and saved details.
- `contracts` — compatible display-mode inputs and resolved values in invoice responses.
- `invoices-api` — creation, revision, preview, copy and PDF behavior in either mode.
- `data-model` — invoice-level preference and grouping from historical entry snapshots.

## Impact

This change builds on the invoice editor, saved documents and PDF introduced by [#527](https://github.com/ITSUA-team/GiTiempo/issues/527). Apply its spec deltas after `extend-invoice-management`. It affects the Admin SPA, shared contracts and OpenAPI, and the invoice API and PDF renderer. The existing invoice document can store the option without a database backfill. Existing access rules and billing calculations apply to both formats.

## Acceptance criteria

- [x] Complete the component-by-component comparison with the approved `GITiempo.pen` frames for desktop and mobile creation, editing and details, and for both PDF formats. Record the results and resolve discrepancies as specified in [tasks.md](tasks.md).

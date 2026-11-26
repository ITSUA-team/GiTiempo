# Invoice implementation parity checklist

Source: approved product decisions and `design.md` field/order matrix for #537; existing `GITiempo.pen` invoice screens. Existing implementation chrome/tokens remain the visual baseline.

The pen.dev tool returned a plan usage-limit error on 2026-11-17. The user subsequently explicitly authorized editing the local `.pen` JSON. The checklist below guided the completed local design update; the initial planning-before-implementation timing was missed and is not claimed retroactively.

Local edit scope (recorded before editing):

- Update the four create/edit desktop/mobile frames under `EGHj0` and their four Task-mode counterparts under `inv_time_modes`.
- Preserve existing IDs, entry/task examples, PDF/detail output, tokens and the single primary footer action. Move existing field nodes instead of recreating them.
- Put dates and period first, then secondary title/group, parties, services/pricing, work, totals with editable discount, payment and Notes.
- Update four Card/Other desktop/mobile variants and add explicit inline validation examples for dates, parties and all payment methods.
- Correct interaction contexts for complete Drafts, historical correction and guarded status changes. Check canvas bounds and all references/IDs.
- Compare the edited JSON structure and local layout previews to the actual desktop/mobile QA screenshots. Native pen.dev rendering remains unavailable; local previews must be labelled accordingly.

Check the implemented desktop and mobile pages against these behaviors:

- One primary save action; separate detail status action; no Save as Draft.
- Dates and billing period before parties; From before Bill to; party name/address/email/Tax ID order.
- Services/project before work/pricing; subtotal/discount/total before payment; notes last.
- Title/group secondary, logo optional, generated reference read-only; rounding/time display near work.
- Required markers and accessible required state for both party core fields, services, dates/period, rate/currency and applicable payment fields.
- Bank transfer requires beneficiary/bank/account; Card provider/HTTPS link; Other/custom method/account Payment details. Instructions optional for every method.
- Optional fields have no optional suffix or required marker.
- Submit shows all missing/invalid field errors, actual date-input invalid styling, first-error focus and independent clearing.
- Hidden local payment values survive switches but inactive malformed values are omitted on save.
- Same DOM/focus sequence on desktop/mobile; scrollable body and reachable footer; token-based existing spacing, radii and controls.
- Complete zero-entry invoices can be saved/downloaded; historical incomplete records can be viewed and corrected but not status-updated until complete.

Reusable-pattern review: retain the existing invoice dates, payment fields, entry selection, dialogs and form tokens. Add only a focused app-local validation helper if needed; no shared frontend extraction is justified by a second proven identical call site.

Final result: the source update, 91 structural checks, local desktop/mobile layout previews and independent review are recorded in [design-parity.md](design-parity.md). All semantic checklist items align. Native Pencil pixel parity remains unverified; local previews are explicitly labelled and do not replace the real-page acceptance reports.

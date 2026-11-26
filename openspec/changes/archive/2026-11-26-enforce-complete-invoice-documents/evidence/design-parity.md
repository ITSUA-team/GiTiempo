# Local design-source update and parity review

Date: 2026-11-17. The user explicitly authorized editing the local `GITiempo.pen` JSON after the Pencil plan quota prevented MCP inspection/update. No remote Pencil service was accessed for this follow-up. The source update happened after implementation and runtime QA; the originally planned before-frontend sequence was missed and is not claimed retroactively.

## Source changes

- Updated all eight create/edit desktop/mobile frames: `i527_0457`, `i527_0633`, `i527_0970`, `i527_1142`, `task_create_desktop`, `task_edit_desktop`, `task_create_mobile`, `task_edit_mobile`.
- Reparented existing fields into dates/period, secondary title/group, From/Bill to, services/pricing, work, totals, payment and Notes. Moved the editable discount into totals after subtotal. Preserved entry/task selections, example arithmetic and the single Create invoice / Save changes action.
- Added the required markers and removed optional suffixes. Admin Project stays optional; its context documents the PM-only required variant. Added the existing SplitButton logo-menu affordance, retaining optional logo behavior.
- Updated Card and Other variants `i527_dates_76`, `i527_dates_119`, `i527_dates_162`, `i527_dates_209`. Card requires provider and Payment link (HTTPS); Other requires Payment details, with optional beneficiary/provider/instructions. Defaults remain partial.
- Added four separate desktop/mobile validation boards (`inv537_0163`, `inv537_0258`, `inv537_0351`, `inv537_0444`). They demonstrate actual Issue date input borders, missing party values, invalid emails, date ordering, and Bank/Card/Other payment errors. These are component state examples, not extra product sections.
- Updated historical/status interaction contexts. Expanded the invoice and Task canvases; shifted the following Settings/Access canvases down while preserving their contents and the 240px inter-canvas gap.

## Verification

[91 structural assertions](pen-structure-check.json) passed: valid JSON, 8,691 unique IDs, all 8,297 original IDs retained, all 26 references resolved, version/variables/file token preserved, unrelated root content unchanged, all eight editor orders and requiredness consistent, method variants correct and both Issue date error controls bordered.

Local HTML/CSS previews were generated directly from the updated nodes using their existing dimensions, spacing, token values and typography attributes. All eight preview roots were checked for horizontal child overflow; none was found. The representative mobile create ends at local y7346, inside the expanded y8500 invoice canvas; Task mobile create ends below y3695, inside y4500. Native Pencil rendering may measure text differently, so these are local-layout bounds rather than native-engine measurements.

- [Time-entry editor previews](pen-local-forms.png)
- [Task editor previews](pen-local-tasks.png)
- [Date/party error previews](pen-local-validation.png)
- [Payment error previews](pen-local-payments.png)

A separate read-only reviewer compared the source against `InvoiceCreateDialog.vue`, `InvoicePaymentFields.vue` and the requiredness matrix. No semantic, ID/reference or source-versus-clone consistency issues remained. Final small visual corrections aligned the period calendar icon and discount percentage with the existing product controls.

## Parity, reuse and remaining limits

Compared the updated source hierarchy and local previews with the real [desktop](desktop-validation.png) and [mobile](mobile-required-errors.png) screenshots and the full desktop/mobile scenario reports. Dates/period before secondary metadata; same party field order; services/pricing before work; discount/totals before payment; conditional payment labels; Notes last; one primary save and a separate status action are aligned. The existing examples use populated work while manual QA also proves the allowed zero-entry state.

Existing `AppDialog`, `SurfaceCard`, date/payment/entry-selection components and PrimeVue inputs, Select, DatePicker, InputNumber, Textarea, Message and SplitButton remain reused. No shared frontend component change or new dependency was needed. No new PrimeVue-specific design exception was identified.

**Remaining visual verification limit:** native Pencil rendering is unavailable because of the plan quota. Local screenshots explicitly say that they are structural previews; font fallback, approximate icon glyphs and differences between CSS and Pencil auto-layout cannot establish exact pixel parity. The existing canvas uses expanded dialogs to expose all fields; the actual product uses its documented viewport-constrained scrollable dialog and reachable footer, verified in runtime QA. No native-render or fresh visual approval is claimed.

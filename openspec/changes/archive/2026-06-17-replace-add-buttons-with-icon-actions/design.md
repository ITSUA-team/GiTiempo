## Context

The affected surfaces are record-list pages in `apps/user-web` and `apps/admin-web`. Current implementations and archived specs still reference text create/add buttons in some locations, while the approved UI docs and `GITiempo.pen` frames now specify primary icon-only create/add actions for contextual section and table-header entry points. Admin Invoices is intentionally excluded from visible scope until an invoice API/contract exists.

Relevant source-of-truth files are `docs/ui/pages-user.md`, `docs/ui/pages-admin.md`, `docs/ui/patterns.md`, `docs/ui/components.md`, `docs/ui/accessibility.md`, `apps/user-web/AGENTS.md`, and `apps/admin-web/AGENTS.md`. The approved design frames are `Time Entries`, `Projects List`, `Admin Members`, and `Admin Projects`; the `Admin Invoices` frame remains deferred.

No backend coordination is required. The existing create/edit/invite dialogs, API clients, validation, routes, and mutation flows remain responsible for the actual operations; only opener affordances change.

## Goals / Non-Goals

**Goals:**
- Replace contextual create/add text openers with filled primary icon-only PrimeVue actions on the specified user and admin pages.
- Keep tooltip text and `aria-label` explicit and equal to the previous action intent.
- Preserve existing opener behavior: selected day prefill for Time Entries, selected project prefill for User Projects, member invite flow entry, and `/projects/new` navigation for Admin Projects.
- Keep the temporary Admin Invoices section invisible until invoice contracts exist.
- Cover both desktop/table and mobile-card branches where the action appears, especially User Projects mobile sections.
- Keep implementation aligned with approved `.pen` layout, token-backed styling, and PrimeVue component conventions.

**Non-Goals:**
- Changing dialog titles, dialog submit buttons, form field order, validation, API request payloads, or mutation behavior.
- Adding new backend endpoints, shared contracts, database changes, OpenAPI changes, or visible invoice UI.
- Refactoring unrelated row actions, delete/edit flows, filters, pagination, or table shells.
- Replacing PrimeVue buttons with custom raw controls.

## Decisions

1. Use PrimeVue `<Button>` for all affected icon-only actions.

Rationale: PrimeVue is the standard app control surface and already provides button semantics, disabled/loading states, and tooltip integration. The alternative, custom raw `<button>` markup, would duplicate component behavior and conflict with app guidance.

2. Treat the existing tooltip and accessible labels as behavioral requirements.

Rationale: Icon-only actions remove visible text, so explicit copy is required to preserve understandability and accessibility. The alternative, relying on icon shape alone, would be ambiguous for create/invite variants and violate the icon-only button rules.

3. Keep opener state and event contracts unchanged.

Rationale: This is a visual/interaction affordance update, not a workflow rewrite. The existing dialog open handlers should continue to receive the same day, project, or route intent context. The alternative, consolidating create workflows while touching the UI, would expand risk beyond the requested design update.

4. Apply the pattern locally where product behavior differs, and extract only if an existing shared icon-action leaf already fits.

Rationale: The affected surfaces share a visual pattern but differ in labels, icons, emitted events, and navigation behavior. A broad shared component is only justified if the current codebase already has a small stable action primitive; otherwise, local PrimeVue buttons keep the change minimal.

5. Verify both app branches and mobile-specific rendering where applicable.

Rationale: The scope spans both SPAs and includes a mobile User Projects variant. User and admin lint/typecheck plus focused tests around affected components provide regression coverage without requiring backend tests.

## Risks / Trade-offs

- Icon-only affordances may be less discoverable without visible text -> Mitigate with explicit tooltips, accessible labels, primary filled styling, and placement next to contextual section/table titles.
- Multiple surfaces may drift visually if each defines button classes independently -> Mitigate by reusing existing PrimeVue button conventions or the smallest existing shared action primitive when available.
- Existing tests may assert visible button text -> Mitigate by updating tests to query by accessible name rather than visible text for icon-only openers.
- Mobile and desktop branches can diverge -> Mitigate with branch-specific tests for User Projects mobile cards and desktop/table sections.
- Design and PrimeVue internals may not match exactly -> Mitigate by preserving the design intent through PrimeVue `Button` props and token-backed `pt` overrides, documenting any PrimeVue-only compromise during implementation.

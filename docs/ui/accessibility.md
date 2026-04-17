<!-- Scope: accessibility requirements and PrimeVue coverage -->
<!-- Read when: implementing forms, buttons, dialogs, or keyboard interaction -->

# Accessibility

## Developer Responsibilities

- All interactive elements need a visible focus indicator.
- For custom non-PrimeVue controls, use `outline-2 outline-brand outline-offset-2`.
- Meet WCAG 2.1 AA contrast targets.
- All form fields need associated `<label>` elements.
- Icon-only buttons need `aria-label`.
- Custom interactive elements must support keyboard navigation.

## Covered By PrimeVue

Do not re-implement these when using the corresponding PrimeVue component:

| Concern | PrimeVue component | Built-in behavior |
|---|---|---|
| Focus trapping in modals | `<Dialog modal>` | Traps focus and restores it on close |
| Sort announcements | `<DataTable>` | Renders `aria-sort` on sortable columns |
| Dropdown keyboard nav | `<Select>`, `<MultiSelect>` | Arrow keys, Enter, Escape |
| Date picker keyboard nav | `<DatePicker>` | Arrow keys and Enter |
| Toast live region | `<Toast>` | `role="alert"` / `aria-live="assertive"` |
| Confirm dialog focus | `<ConfirmDialog>` | Auto-focuses the safe action |

When using `pt`, never remove or override PrimeVue-generated `role`, `aria-*`, `tabindex`, or `id` attributes.

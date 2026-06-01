<!-- Scope: tokens, typography, spacing, component conventions -->
<!-- Read when: implementing reusable UI pieces or validating per-component styling -->

# Components

## Design System

### Color Rules

| Token name     | CSS variable          | Tailwind utility          | Hex       | Usage                                                       |
| -------------- | --------------------- | ------------------------- | --------- | ----------------------------------------------------------- |
| Brand Purple   | `--color-brand`       | `bg-brand` / `text-brand` | `#5D2B85` | Primary accent, folder icons, active states, filled buttons |
| Accent Tint    | `--color-accent-tint` | `bg-accent-tint`          | `#E8E1F5` | Active row backgrounds, tag fills, hover states             |
| Surface        | `--color-surface`     | `bg-surface`              | `#FFFFFF` | Cards and container backgrounds                             |
| App Background | `--color-app-bg`      | `bg-app-bg`               | `#F4F4F5` | Main application canvas                                     |
| Text Dark      | `--color-text-dark`   | `text-text-dark`          | `#1A1A1A` | Headings and primary copy                                   |
| Text Muted     | `--color-text-muted`  | `text-text-muted`         | `#666666` | Secondary info and metadata                                 |
| Text Inverse   | `--color-text-inverse` / `--color-text-inverse-muted` | `text-text-inverse` / `text-text-inverse-muted` | `#FFFFFF` / `rgba(255,255,255,0.7)` | Text on brand, destructive, and dark surfaces |
| Dividers       | `--color-divider`     | `border-divider`          | `#EEEEEE` | Borders and separators                                      |

- Never use Brand Purple as a large background area.
- Accent Tint is the only permitted purple-tinted background surface.
- Text on Brand Purple must use `text-text-inverse`.
- Text on Accent Tint must be `text-text-dark` or `text-brand`.
- Use token utilities instead of raw hex values in markup.

### Typography

| Role                      | Font  | Weight | Size | Tailwind classes          |
| ------------------------- | ----- | ------ | ---- | ------------------------- |
| Font family               | Inter | —      | —    | `font-sans`               |
| H1                        | Inter | 600    | 24px | `text-2xl font-semibold`  |
| H2                        | Inter | 600    | 18px | `text-lg font-semibold`   |
| H3                        | Inter | 600    | 16px | `text-base font-semibold` |
| Primary body / labels     | Inter | 500    | 14px | `text-sm font-medium`     |
| Secondary body / metadata | Inter | 400    | 13px | `text-[13px] font-normal` |
| Captions / helper         | Inter | 400    | 12px | `text-xs font-normal`     |

- Weight 600 is for headings, active nav labels, and key numeric values.
- Weight 500 is the default for interactive UI.
- Weight 400 is for supporting text.

### Spacing, Radius, Shadows

- Base unit: `4px`.
- Common spacing: `gap-4` / `p-4`.
- Section spacing: `gap-6` / `gap-8`.

| Context               | Token              | Class            |
| --------------------- | ------------------ | ---------------- |
| Buttons, inputs, tags | `--radius-sm`      | `rounded-sm`     |
| Dropdowns, tooltips   | `--radius-md`      | `rounded-md`     |
| Cards, panels, modals | `--radius-lg`      | `rounded-lg`     |
| Cards, panels         | `--shadow-card`    | `shadow-card`    |
| Popovers, dropdowns   | `--shadow-popover` | `shadow-popover` |
| Modals, dialogs       | `--shadow-modal`   | `shadow-modal`   |

## PrimeVue Styling Rule

All PrimeVue components receive brand styling primarily through the global preset. Use `pt` for per-instance Tailwind overrides. Do not use `!important` or deep CSS selectors.

Standard app UI must use PrimeVue components when PrimeVue has an equivalent. Do not use raw `<button>`, `<input>`, `<textarea>`, `<select>`, custom status pills, custom avatars, custom tables, custom dialogs, or custom loading spinners for normal SPA UI unless the component is explicitly outside PrimeVue scope or the approved design requires a bespoke non-standard control.

When the same PrimeVue-based UI block is used by both `apps/user-web` and `apps/admin-web`, prefer a small shared Vue component in `packages/web-shared` instead of duplicated app-local markup. Keep route-level pages, full shells, route maps, and product-specific copy app-local unless the shared component has a stable parameterized contract.

## Component Conventions

### Buttons

Use PrimeVue `<Button>`. Do not recreate app buttons with raw HTML unless the surface is explicitly non-PrimeVue, such as the extension popup.

| Variant     | PrimeVue props                            | Usage                 |
| ----------- | ----------------------------------------- | --------------------- |
| Primary     | default button styling                    | Main actions          |
| Secondary   | `severity="secondary" variant="outlined"` | Alternative actions   |
| Ghost       | `variant="text"`                          | Low-emphasis actions  |
| Destructive | `severity="danger" variant="outlined"`    | Delete and disconnect |
| Disabled    | `disabled`                                | Unavailable action    |

- Heights: `h-8`, `h-9`, `h-10` depending on density.
- Minimum touch target: 44x44px via padding.
- Loading state: use `<Button loading>`.
- When one action is documented as primary and another is support or retry behavior, keep the primary action visually dominant. Do not render primary and secondary actions with the same variant weight.
- In action rows that mix a main CTA with refresh, retry, or cancel helpers, use the documented primary CTA as the default filled button and keep helpers secondary, ghost, or outlined unless the spec says otherwise.

### Form Inputs

Use `<InputText>`, `<Textarea>`, `<InputNumber>`, `<Password>`, `<Select>`, `<AutoComplete>`, `<Checkbox>`, and `<DatePicker>` as appropriate for the field type. For form payloads that are shared between apps or map to API contracts, validate with Zod before submitting.

- Wrap in `<div class="flex flex-col gap-1">` with a real `<label>`.
- Single-line height: `h-[38px]`.
- Background: `bg-surface`.
- Error state: `invalid` prop plus `<small class="text-xs text-destructive">`.
- Full width: `class="w-full"`.

```vue
<div class="flex flex-col gap-1">
  <label for="name" class="text-[13px] font-medium text-text-dark">Display Name</label>
  <InputText id="name" v-model="name" :invalid="!!errors.name" class="w-full" />
  <small v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</small>
</div>
```

### Forms And Zod

- Use shared Zod schemas from `@gitiempo/shared` for contract-facing payloads and responses.
- Keep browser-only form schemas close to the form or in `packages/web-shared` when both SPAs use the same form.
- Parse or `safeParse` form data before calling stores, Firebase, or HTTP clients when invalid input can otherwise cross a boundary.
- Keep response parsing in shared HTTP clients so both SPAs fail consistently on API drift.
- Do not duplicate the same Zod schema in both apps; extract it to `@gitiempo/shared` when it is contract-facing or `@gitiempo/web-shared` when it is frontend-only.

```typescript
const result = emailPasswordSignInSchema.safeParse({ email, password });

if (!result.success) {
  // Show field-level errors through PrimeVue invalid/helper UI.
  return;
}
```

### Tables

Use `<DataTable>` and `<Column>`.

- Header row: `bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark`.
- Body row: `h-12 border-b border-divider hover:bg-app-bg`.
- Searchable admin tables use the PrimeVue DataTable global filter pattern by default: table/card header contains a right-aligned `IconField` + `InputIcon` + `InputText` search control bound to table filter state.
- Admin table search placeholder copy follows `Search <table label>`, for example `Search invoices`, `Search members`, `Search projects`, and `Search report rows`.
- Admin table search filters the visible table rows using DataTable `globalFilterFields` where native PrimeVue headers are used. When a table uses the shared `ManagementTableShell` with custom headers and hidden native DataTable headers, local computed filtering over the loaded rows is the accepted equivalent. Do not document either pattern as a new backend free-text endpoint unless the API contract is updated separately.
- Admin tables with filterable columns use a compact filter row directly below the header row, with one filter control per filterable column and no filter control in the actions column. Use PrimeVue `filterDisplay="row"` when native headers are active; use the `ManagementTableShell` filters slot when the shared management chrome owns the header row.
- Use column-appropriate PrimeVue filter controls: `InputText` for text/id/name/email/source filters, `Select` for single status/role/visibility filters, `MultiSelect filter display="chip"` for member/project assignment filters, and numeric/date controls only when the column data type requires them.
- Clearing global search or a column filter restores the full result set allowed by page-level filters and role scope.
- Selected row: `bg-accent-tint text-text-dark`.
- Right align numeric columns.
- Table row actions are icon-only in both SPAs. Do not render visible action text such as `Edit`, `Delete`, or `View` inside action cells.
- Use the former action text as both the PrimeVue tooltip copy and the accessible label, e.g. an edit icon button with tooltip `Edit`.
- Use Brand Purple for primary non-destructive action icons, Text Muted for secondary non-destructive actions such as `Unarchive`, and Destructive red for delete/remove/archive icons.
- Keep row action columns compact, right-aligned, and visually secondary to the row content.

```vue
<DataTable
  :value="entries"
  :pt="{
    headerCell:
      'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
    bodyRow: 'border-b border-divider h-12 hover:bg-app-bg',
    bodyCell: 'text-sm',
  }"
/>
```

### Tags And Badges

Use `<Tag>` for status labels and `<Badge>` for counts.

- Default tag style: `bg-accent-tint text-brand rounded-sm px-2 py-0.5 text-xs font-medium`.
- Map status styling through preset severity variants.

| Status           | PrimeVue severity | Background            | Text                      |
| ---------------- | ----------------- | --------------------- | ------------------------- |
| Running / Active | `success`         | `bg-status-active-bg` | `text-status-active-text` |
| Completed        | default           | `bg-accent-tint`      | `text-brand`              |
| Pending / Draft  | `warn`            | `bg-status-warn-bg`   | `text-status-warn-text`   |
| Error            | `danger`          | `bg-status-error-bg`  | `text-status-error-text`  |

### Avatars

Use `<Avatar>`.

- Default size: `class="size-8"`.
- Fallback initials: `shape="circle"` and `label`.
- Large profile avatar: `class="size-16"`.

```vue
<Avatar
  :image="user.avatarUrl"
  :label="!user.avatarUrl ? initials : undefined"
  shape="circle"
  class="size-8"
  :pt="{ root: 'bg-accent-tint text-brand text-[13px] font-semibold' }"
/>
```

### Icons

- Primary custom icon library: Heroicons.
- PrimeIcons are used only for icons rendered internally by PrimeVue.
- Common sizes: `size-4`, `size-5`, `size-6`.

### Empty States

- Icon or illustration: `size-12` to `size-16`, tinted with brand colors.
- Primary message: `text-base font-semibold text-text-dark`.
- Supporting message: `text-sm text-text-muted`.
- Optional CTA: primary `<Button>`.

### Loading States

Use `<Skeleton>` for inline placeholders and page-level first-load placeholders. Reserve `<ProgressSpinner>` for small indeterminate regions where a skeleton cannot match the final structure.

- Table/list loading: render skeleton rows sized like final content.
- Structured content-rich first loads may use PrimeVue `<Skeleton>` placeholders instead of a spinner when the skeleton mirrors the final header, card, field rows, and action layout.
- Full page loading: centered spinner for generic indeterminate page loads where a structured skeleton is not more accurate.
- Request-error states must remain distinct from empty states and default form values; do not show empty/default content after a failed required request.
- Button loading: `<Button loading>`.

```vue
<div v-if="loading" class="flex flex-col gap-4">
  <Skeleton width="14rem" height="2rem" />
  <Skeleton height="8rem" />
  <Skeleton height="16rem" />
</div>
```

Color the spinner via preset tokens or `pt` overrides, not a removed component prop.

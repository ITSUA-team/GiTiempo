<!-- Scope: tokens, typography, spacing, component conventions -->
<!-- Read when: implementing reusable UI pieces or validating per-component styling -->

# Components

## Design System

### Color Rules

| Token name | CSS variable | Tailwind utility | Hex | Usage |
|---|---|---|---|---|
| Brand Purple | `--color-brand` | `bg-brand` / `text-brand` | `#5D2B85` | Primary accent, folder icons, active states, filled buttons |
| Accent Tint | `--color-accent-tint` | `bg-accent-tint` | `#E8E1F5` | Active row backgrounds, tag fills, hover states |
| Surface | `--color-surface` | `bg-surface` | `#FFFFFF` | Cards and container backgrounds |
| App Background | `--color-app-bg` | `bg-app-bg` | `#F4F4F5` | Main application canvas |
| Text Dark | `--color-text-dark` | `text-text-dark` | `#1A1A1A` | Headings and primary copy |
| Text Muted | `--color-text-muted` | `text-text-muted` | `#666666` | Secondary info and metadata |
| Dividers | `--color-divider` | `border-divider` | `#EEEEEE` | Borders and separators |

- Never use Brand Purple as a large background area.
- Accent Tint is the only permitted purple-tinted background surface.
- Text on Brand Purple must be white.
- Text on Accent Tint must be `text-text-dark` or `text-brand`.
- Use token utilities instead of raw hex values in markup.

### Typography

| Role | Font | Weight | Size | Tailwind classes |
|---|---|---|---|---|
| Font family | Inter | — | — | `font-sans` |
| H1 | Inter | 600 | 24px | `text-2xl font-semibold` |
| H2 | Inter | 600 | 18px | `text-lg font-semibold` |
| H3 | Inter | 600 | 16px | `text-base font-semibold` |
| Primary body / labels | Inter | 500 | 14px | `text-sm font-medium` |
| Secondary body / metadata | Inter | 400 | 13px | `text-[13px] font-normal` |
| Captions / helper | Inter | 400 | 12px | `text-xs font-normal` |

- Weight 600 is for headings, active nav labels, and key numeric values.
- Weight 500 is the default for interactive UI.
- Weight 400 is for supporting text.

### Spacing, Radius, Shadows

- Base unit: `4px`.
- Common spacing: `gap-4` / `p-4`.
- Section spacing: `gap-6` / `gap-8`.

| Context | Token | Class |
|---|---|---|
| Buttons, inputs, tags | `--radius-sm` | `rounded-sm` |
| Dropdowns, tooltips | `--radius-md` | `rounded-md` |
| Cards, panels, modals | `--radius-lg` | `rounded-lg` |
| Cards, panels | `--shadow-card` | `shadow-card` |
| Popovers, dropdowns | `--shadow-popover` | `shadow-popover` |
| Modals, dialogs | `--shadow-modal` | `shadow-modal` |

## PrimeVue Styling Rule

All PrimeVue components receive brand styling primarily through the global preset. Use `pt` for per-instance Tailwind overrides. Do not use `!important` or deep CSS selectors.

## Component Conventions

### Buttons

Use PrimeVue `<Button>`. Do not recreate app buttons with raw HTML unless the surface is explicitly non-PrimeVue, such as the extension popup.

| Variant | PrimeVue props | Usage |
|---|---|---|
| Primary | default button styling | Main actions |
| Secondary | `severity="secondary" variant="outlined"` | Alternative actions |
| Ghost | `variant="text"` | Low-emphasis actions |
| Destructive | `severity="danger" variant="outlined"` | Delete and disconnect |
| Disabled | `disabled` | Unavailable action |

- Heights: `h-8`, `h-9`, `h-10` depending on density.
- Minimum touch target: 44x44px via padding.
- Loading state: use `<Button loading>`.

### Form Inputs

Use `<InputText>`, `<Textarea>`, `<InputNumber>`, and `<Password>`.

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

### Tables

Use `<DataTable>` and `<Column>`.

- Header row: `bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark`.
- Body row: `h-12 border-b border-divider hover:bg-app-bg`.
- Selected row: `bg-accent-tint text-text-dark`.
- Right align numeric columns.

```vue
<DataTable
  :value="entries"
  :pt="{
    headerCell: 'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
    bodyRow: 'border-b border-divider h-12 hover:bg-app-bg',
    bodyCell: 'text-sm',
  }"
/>
```

### Tags And Badges

Use `<Tag>` for status labels and `<Badge>` for counts.

- Default tag style: `bg-accent-tint text-brand rounded-sm px-2 py-0.5 text-xs font-medium`.
- Map status styling through preset severity variants.

| Status | PrimeVue severity | Background | Text |
|---|---|---|---|
| Running / Active | `success` | `bg-status-active-bg` | `text-status-active-text` |
| Completed | default | `bg-accent-tint` | `text-brand` |
| Pending / Draft | `warn` | `bg-status-warn-bg` | `text-status-warn-text` |
| Error | `danger` | `bg-status-error-bg` | `text-status-error-text` |

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

Use `<Skeleton>` for inline placeholders and `<ProgressSpinner>` for full-page loads.

- Table/list loading: render skeleton rows sized like final content.
- Full page loading: centered spinner.
- Button loading: `<Button loading>`.

```vue
<div v-if="loading" class="flex h-full items-center justify-center">
  <ProgressSpinner strokeWidth="3" style="width:40px;height:40px" />
</div>
```

Color the spinner via preset tokens or `pt` overrides, not a removed component prop.

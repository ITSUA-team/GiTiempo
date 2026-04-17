# UI Requirements

Build-ready design constraints derived from [PROPOSAL.md](./PROPOSAL.md) and [TECHNICAL-REQUIREMENTS.md](./TECHNICAL-REQUIREMENTS.md).

---

## 0. Stack & Configuration

| Concern | Tool | Version | Reference |
|---|---|---|---|
| Styling | Tailwind CSS | v4 (CSS-first, no `tailwind.config.ts`) | [Tailwind CSS v4 Docs](https://tailwindcss.com/docs) · [v3→v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) · [`@theme` reference](https://tailwindcss.com/docs/theme) |
| Component library | PrimeVue | v4 (Aura preset as base, custom token overrides) | [PrimeVue v4 Docs](https://primevue.org/) · [Theming / Presets](https://primevue.org/theming/styled/) · [PassThrough (`pt`)](https://primevue.org/passthrough/) |
| Icon set | Heroicons (primary) + PrimeIcons (PrimeVue internals) | latest | [Heroicons](https://heroicons.com/) · [PrimeIcons](https://primevue.org/icons/) |
| Utility helpers | `clsx` + `tailwind-merge` (`cn()`) | latest | [tailwind-merge](https://github.com/dcastil/tailwind-merge) · [clsx](https://github.com/lukeed/clsx) |

### 0.1 Tailwind v4 Setup

Tailwind v4 is configured entirely in CSS via `@theme`. There is **no `tailwind.config.ts`**.

```css
/* src/assets/main.css */
@import "tailwindcss";

@theme {
  /* Brand tokens */
  --color-brand:        #5D2B85;
  --color-accent-tint:  #E8E1F5;
  --color-surface:      #FFFFFF;
  --color-app-bg:       #F4F4F5;
  --color-text-dark:    #1A1A1A;
  --color-text-muted:   #666666;
  --color-divider:      #EEEEEE;

  /* Semantic aliases */
  --color-primary:      var(--color-brand);
  --color-destructive:  #D32F2F;

  /* Status colors */
  --color-status-active-bg:   #E8F5E9;
  --color-status-active-text: #2E7D32;
  --color-status-warn-bg:     #FFF8E1;
  --color-status-warn-text:   #F57F17;
  --color-status-error-bg:    #FFEBEE;
  --color-status-error-text:  #C62828;

  /* Typography */
  --font-sans: 'Inter', sans-serif;

  /* Radius tokens */
  --radius-sm:   6px;   /* buttons, inputs, tags */
  --radius-md:   8px;   /* tooltips, dropdowns */
  --radius-lg:   10px;  /* cards, modals */
  --radius-full: 9999px; /* avatars */

  /* Shadow tokens */
  --shadow-card:    0 1px 4px rgba(0,0,0,0.08);
  --shadow-popover: 0 4px 12px rgba(0,0,0,0.12);
  --shadow-modal:   0 8px 32px rgba(0,0,0,0.16);
}
```

Tokens defined in `@theme` are automatically available as Tailwind utilities:
`bg-brand`, `text-brand`, `text-text-muted`, `bg-app-bg`, `rounded-sm`, `shadow-card`, etc.

### 0.2 PrimeVue Configuration

Use PrimeVue v4 in **styled mode** with the Aura preset as the base. Override brand colors by remapping PrimeVue's CSS variable layer to the Tailwind tokens.

```typescript
// main.ts
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

const GiTiempoPreset = definePreset(Aura, {
  semantic: {
    primary: {
      color:        '{color.brand}',      // maps to --color-brand
      contrastColor: '#ffffff',
      hoverColor:   'color-mix(in srgb, var(--color-brand) 85%, black)',
      activeColor:  'color-mix(in srgb, var(--color-brand) 75%, black)',
    },
    colorScheme: {
      light: {
        surface: { 0: '#fff', 50: 'var(--color-app-bg)', 100: 'var(--color-divider)' },
      },
    },
  },
})

app.use(PrimeVue, { theme: { preset: GiTiempoPreset, options: { darkModeSelector: false } } })
```

Use the **`pt` (PassThrough) prop** to apply Tailwind classes to individual PrimeVue component slots when a global preset override is too broad.

```vue
<!-- Example: scoping a DataTable header cell -->
<DataTable :pt="{ headerCell: 'bg-app-bg text-xs font-medium uppercase tracking-wide text-text-dark' }">
```

---

## 1. Design System

### 1.1 Color Palette

| Token name | CSS variable | Tailwind utility | Hex | Usage |
|---|---|---|---|---|
| Brand Purple | `--color-brand` | `bg-brand` / `text-brand` | `#5D2B85` | Primary accent, folder icons, active states, filled buttons |
| Accent Tint | `--color-accent-tint` | `bg-accent-tint` | `#E8E1F5` | Active row backgrounds, tag fills, hover states on list items |
| Surface | `--color-surface` | `bg-surface` | `#FFFFFF` | Card and container backgrounds |
| App Background | `--color-app-bg` | `bg-app-bg` | `#F4F4F5` | Main application canvas |
| Text Dark | `--color-text-dark` | `text-text-dark` | `#1A1A1A` | Headings, primary body copy |
| Text Muted | `--color-text-muted` | `text-text-muted` | `#666666` | Secondary info, timestamps, metadata labels |
| Dividers | `--color-divider` | `border-divider` | `#EEEEEE` | Borders, separators, table row lines |

**Usage rules:**

- Never use Brand Purple as a background for large areas — reserve it for accents, icons, and focused elements.
- Accent Tint is the only permitted purple-tinted background surface.
- All text on Brand Purple backgrounds must be `#FFFFFF`.
- All text on Accent Tint backgrounds must be `#1A1A1A` or `#5D2B85`.
- Always use the Tailwind token utilities (e.g. `bg-brand`) — never use raw hex values in class attributes.

### 1.2 Typography

| Role | Font | Weight | Size | Tailwind classes |
|---|---|---|---|---|
| Font Family | `'Inter', sans-serif` | — | — | `font-sans` (set on `body`) |
| Page headings (H1) | Inter | 600 (Semi-bold) | 24px | `text-2xl font-semibold` |
| Section headings (H2) | Inter | 600 (Semi-bold) | 18px | `text-lg font-semibold` |
| Card / panel headings (H3) | Inter | 600 (Semi-bold) | 16px | `text-base font-semibold` |
| Primary body / labels | Inter | 500 (Medium) | 14px | `text-sm font-medium` |
| Secondary body / metadata | Inter | 400 (Regular) | 13px | `text-[13px] font-normal` |
| Captions / helper text | Inter | 400 (Regular) | 12px | `text-xs font-normal` |

**Usage rules:**

- Weight 600 is restricted to headings, active navigation labels, and key numeric values (e.g., total hours).
- Weight 500 is the default for all interactive elements: buttons, form labels, table column headers.
- Weight 400 is for supporting text: descriptions, timestamps, secondary rows.
- Never use weight below 400.
- Line height: `1.5` for body copy, `1.2` for headings.

### 1.3 Spacing Scale

Base unit: `4px`. All padding, margin, and gap values must be multiples of `4px`.

| Step | Value | Tailwind class | Typical use |
|---|---|---|---|
| xs | 4px | `gap-1` / `p-1` | Icon-to-label gap, dense table cell padding |
| sm | 8px | `gap-2` / `p-2` | Inline element spacing, compact list items |
| md | 12px | `gap-3` / `p-3` | Form field internal padding, card inner padding |
| base | 16px | `gap-4` / `p-4` | Default block spacing, button padding |
| lg | 24px | `gap-6` / `p-6` | Section vertical gap, card gap in grid |
| xl | 32px | `gap-8` / `p-8` | Page section spacing |
| 2xl | 48px | `gap-12` / `p-12` | Major layout separation |

### 1.4 Border Radius

| Context | Radius | CSS token | Tailwind class |
|---|---|---|---|
| Buttons, form inputs, tags | `6px` | `--radius-sm` | `rounded-sm` |
| Tooltips, dropdowns | `8px` | `--radius-md` | `rounded-md` |
| Cards, panels, modals | `10px` | `--radius-lg` | `rounded-lg` |
| Avatars | `50%` (full circle) | `--radius-full` | `rounded-full` |

### 1.5 Elevation / Shadows

Use shadows sparingly. Only cards and floating surfaces (dropdowns, modals, tooltips) receive elevation.

| Level | Usage | CSS token | Tailwind class |
|---|---|---|---|
| 0 | Flat surfaces, inline elements | — | `shadow-none` |
| 1 | Cards, panels | `--shadow-card` | `shadow-card` |
| 2 | Dropdowns, popovers | `--shadow-popover` | `shadow-popover` |
| 3 | Modals, dialogs | `--shadow-modal` | `shadow-modal` |

---

## 2. Component Conventions

**PrimeVue styling rule:** All PrimeVue components receive brand styling primarily through the global preset (§0.2). Use the `pt` prop for per-instance Tailwind overrides. Never add `!important` or deep CSS selectors to fight PrimeVue styles.

### 2.1 Buttons

**PrimeVue component:** `<Button>` — set severity and variant via PrimeVue props; do not replicate button styles with raw Tailwind `<button>` elements.

| Variant | PrimeVue props | Background | Text | Border | Usage |
|---|---|---|---|---|---|
| Primary | `severity="primary"` | `bg-brand` | `#FFFFFF` | none | Main actions (Save, Start Timer, Create) |
| Secondary | `severity="secondary"` / `outlined` | `bg-surface` | `text-brand` | `border-brand` | Alternative actions (Cancel, Edit) |
| Ghost | `text` | transparent | `text-brand` | none | Low-emphasis actions (Clear, View all) |
| Destructive | `severity="danger"` / `outlined` | `bg-surface` | `text-destructive` | `border-destructive` | Delete, Disconnect |
| Disabled | `disabled` prop | `bg-app-bg` | `text-text-muted` | `border-divider` | Any unavailable action |

- Button height: `h-9` (36px default), `h-8` (32px compact), `h-10` (40px large/CTA).
- Minimum touch target: 44×44px (met by padding, not by visual size alone).
- Loading state: use PrimeVue `<Button loading>` — it renders a built-in spinner and keeps button width fixed.

### 2.2 Form Inputs

**PrimeVue components:** `<InputText>`, `<Textarea>`, `<InputNumber>`, `<Password>`. Wrap each with a `<div class="flex flex-col gap-1">` containing a `<label>` and the input.

- Height: `h-[38px]` for single-line inputs (`size="small"` on `<InputText>`), auto-height for `<Textarea>`.
- Border: `border border-divider`, focused border: preset primary focus ring (`border-brand` + `ring-1 ring-brand`).
- Background: `bg-surface`.
- Placeholder text: `text-text-muted font-normal`.
- Error state: apply `invalid` prop on PrimeVue input for red border; render error message below with `<small class="text-xs font-normal text-destructive">`.
- Labels: placed above the field via `<label class="text-[13px] font-medium text-text-dark">`.
- Full-width inputs: add `class="w-full"` to the PrimeVue component.

```vue
<div class="flex flex-col gap-1">
  <label for="name" class="text-[13px] font-medium text-text-dark">Display Name</label>
  <InputText id="name" v-model="name" :invalid="!!errors.name" class="w-full" />
  <small v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</small>
</div>
```

### 2.3 Tables

**PrimeVue component:** `<DataTable>` + `<Column>`. Use the `pt` prop to apply brand styles to header cells and rows.

```vue
<DataTable
  :value="entries"
  :pt="{
    headerCell: 'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
    bodyRow:    'border-b border-divider h-12 hover:bg-app-bg',
    bodyCell:   'text-sm',
  }"
>
```

- Header row: `bg-app-bg`, text `text-text-dark text-[13px] font-medium uppercase tracking-wide`.
- Row height: `h-12` (48px), border-bottom `border-divider`.
- Active / selected row: `bg-accent-tint text-text-dark` (via `:row-class` binding).
- Hover row: `hover:bg-app-bg`.
- Numeric columns (hours, amounts): right-aligned via `<Column body-style="text-align: right">` or `class="text-right"` on `<Column>`.
- Sortable columns: PrimeVue renders sort icons automatically; override sort icon color to `text-brand` via preset.

### 2.4 Tags / Badges

**PrimeVue component:** `<Tag>` for status labels; `<Badge>` for numeric counters on avatars / nav items.

Default tag: `bg-accent-tint text-brand rounded-sm px-2 py-0.5 text-xs font-medium` — apply via `<Tag :pt="{ root: '...' }">` or globally in preset.

Status variants — pass via `severity` prop and map in the preset:

| Status | PrimeVue severity | Background | Text |
|---|---|---|---|
| Running / Active | `success` | `bg-status-active-bg` | `text-status-active-text` |
| Completed | `primary` (default) | `bg-accent-tint` | `text-brand` |
| Pending / Draft | `warn` | `bg-status-warn-bg` | `text-status-warn-text` |
| Error | `danger` | `bg-status-error-bg` | `text-status-error-text` |

### 2.5 Avatars

**PrimeVue component:** `<Avatar>`.

- Default size: `size="normal"` (32px) — override with `class="size-8"`.
- Fallback (no image): `shape="circle"`, `label="AB"` — PrimeVue renders initials. Override background to `bg-accent-tint text-brand text-[13px] font-semibold` via `pt`.
- Large (profile page): `class="size-16"`.

```vue
<Avatar
  :image="user.avatarUrl"
  :label="!user.avatarUrl ? initials : undefined"
  shape="circle"
  class="size-8"
  :pt="{ root: 'bg-accent-tint text-brand text-[13px] font-semibold' }"
/>
```

### 2.6 Icons

- Primary library: **Heroicons** (outline set by default; solid for active/filled states). Import as Vue components from `@heroicons/vue/24/outline` and `@heroicons/vue/24/solid`.
- PrimeIcons are available as a secondary set — used only where PrimeVue renders icons internally (sort arrows, close buttons, calendar chevrons). Do not mix PrimeIcons into custom UI.
- Default size: `size-5` (20px) inline with text, `size-4` (16px) inside buttons, `size-6` (24px) for standalone actions.
- Color: inherit from parent text color (`currentColor`) unless semantically overridden (e.g., folder icon: `text-brand`).

```vue
<ChevronDownIcon class="size-4 text-text-muted" />
<FolderIcon class="size-5 text-brand" />
```

### 2.7 Empty States

Each list, table, and dashboard widget must define an empty state:

- Centered illustration or icon (48–64px, color `#E8E1F5` fill with `#5D2B85` stroke).
- Primary message: 16px / weight 600 / `#1A1A1A`.
- Supporting message: 14px / weight 400 / `#666666`.
- Optional CTA button (Primary variant).

### 2.8 Loading States

**PrimeVue components:** `<Skeleton>` for inline placeholder rows; `<ProgressSpinner>` for full-page loads.

- **Inline data** (tables, lists): use `<Skeleton>` rows matching the content's approximate height and column layout. Set `class="bg-app-bg"` and animate with Tailwind `animate-pulse` via `pt`.
- **Full page initial load**: centered `<ProgressSpinner>` with `strokeColor` set to `var(--color-brand)`.
- **Button actions**: use PrimeVue `<Button loading>` (see §2.1).
- Skeleton shimmer: base `bg-app-bg`, highlight wave via PrimeVue's built-in animation (override color to `bg-divider` if needed).

```vue
<!-- Table skeleton -->
<template v-if="loading">
  <Skeleton v-for="i in 5" :key="i" height="48px" class="mb-px" />
</template>

<!-- Full-page spinner -->
<div v-if="loading" class="flex h-full items-center justify-center">
  <ProgressSpinner strokeWidth="3" style="width:40px;height:40px" />
</div>
```

---

## 3. Layout & Navigation

### 3.1 Overall Shell

Both the User SPA and Admin SPA share the same shell structure:

```
┌─────────────────────────────────────────────┐
│  Top Bar (64px)                             │
│  Logo | Nav tabs (or none) | User avatar    │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │  Main Content Area           │
│  (240px)     │  (fluid, min 0)              │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

- **Top Bar:** background `#FFFFFF`, border-bottom `1px solid #EEEEEE`, height `64px`.
  - Left: product logo + workspace name (16px / weight 600 / `#1A1A1A`).
  - Right: user avatar + display name, settings icon.
- **Sidebar:** background `#FFFFFF`, border-right `1px solid #EEEEEE`, width `240px` (collapsible to `64px` icon-only on narrow viewports).
- **Main Content Area:** background `#F4F4F5`, padding `24px`.

### 3.2 Sidebar Navigation

- Nav item height: `44px`, padding `0 16px`.
- Default state: text `#1A1A1A` / 14px / weight 500, icon `#666666`.
- Hover: background `#F4F4F5`.
- Active: background `#E8E1F5`, text `#5D2B85` / weight 600, icon `#5D2B85`, left border `3px solid #5D2B85`.
- Section dividers between nav groups: `1px solid #EEEEEE` with 8px vertical margin.

### 3.3 Responsive Breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| Mobile | < 640px | Sidebar hidden; bottom navigation bar (5 items max) |
| Tablet | 640px – 1024px | Sidebar collapses to icon-only (64px) |
| Desktop | > 1024px | Full sidebar (240px), standard layout |

> MVP target is desktop-first. Mobile layout is required but de-prioritized for styling polish.

### 3.4 Page Header Pattern

Every page has a consistent header block:

```
┌───────────────────────────────────────────┐
│  Page Title (H1)          [Primary CTA]   │
│  Optional subtitle / breadcrumb           │
└───────────────────────────────────────────┘
```

- Title: 24px / weight 600 / `#1A1A1A`.
- Subtitle: 14px / weight 400 / `#666666`.
- CTA button (Primary variant) right-aligned, vertically centered with title.

---

## 4. User SPA — Page Specifications

### 4.1 Dashboard

- **Active Timer widget:** prominent card (full-width), shows task name, project, elapsed time (HH:MM:SS in 24px / weight 600 / Brand Purple), Stop button (Destructive variant).
- **Recent Time Entries:** table showing last 10 entries — columns: Task, Project, Date, Duration, Actions (Edit / Delete icons). No entries → empty state with "Start your first timer" CTA.
- **Stats row (optional for MVP):** 3 stat cards (Today's total, This week, This month) — value in 24px / weight 600 / `#1A1A1A`, label in 12px / weight 400 / `#666666`.

### 4.2 Timer Page

- **Task Selector:** cascading dropdown sequence — Organization → Project/Repo → Issue. Each level renders as a searchable dropdown. Selected path shown as breadcrumb: `Org / Project / Issue #123` in 14px / weight 500.
- **Manual Task Input:** text input shown as a fallback when no GitHub connection is present or user selects "Manual entry". Input placeholder: "What are you working on?".
- **Start / Stop Button:** large (48px height), full-width on mobile, 240px fixed width on desktop. Start = Primary variant; Stop = Destructive variant. Disabled until a task is selected or a description is entered.
- **Timer Display:** centered, 48px / weight 600 / `#5D2B85`, format `HH:MM:SS`.
- **Manual Interval Entry:** collapsible panel below the timer — Date picker, Start time, End time, Duration (auto-calculated). Inputs follow standard form conventions (§2.2).

### 4.3 Time Entries Page

- **Filters bar:** Date range picker + Project filter (multi-select dropdown) + Search input. All in a single horizontal row.
- **Entries list:** grouped by day. Each group has a day header (`Monday, Apr 14 · 3h 20m`) in 13px / weight 600 / `#666666` with a right-aligned daily total.
- **Entry row:** Task name (weight 500), Project (weight 400 / `#666666`), Time range, Duration, Edit (Ghost button) / Delete (Ghost button / destructive text). Active (running) entry highlighted with Accent Tint background.
- **Inline edit:** clicking Edit opens an inline form within the row (not a modal) for fast edits.

### 4.4 Project View Page

- Header: Project name, description, total tracked hours to date.
- Read-only time entries table filtered to the selected project. Columns: Member, Task, Date, Duration.
- No edit or delete actions visible — this is a view-only page for members.

### 4.5 Profile Page

- **Display Name:** editable inline field.
- **GitHub Connection card:**
  - Disconnected: Brand Purple "Connect GitHub" button, description of what it enables.
  - Connected: avatar, GitHub username, scopes list, "Disconnect" button (Destructive variant), last-synced timestamp in Text Muted.
- **Sign Out:** Ghost button at the bottom of the page, destructive text color.

---

## 5. Admin SPA — Page Specifications

### 5.1 Dashboard

- **Summary stat cards (4):** Total hours this month, Active members, Open projects, Unpaid invoices. Card: Surface background, shadow level 1, stat value 32px / weight 600 / `#1A1A1A`, label 13px / weight 400 / Text Muted.
- **Recent activity feed:** last 20 time entries across all users — same table structure as User SPA §4.3 but read-only with a Member column added.

### 5.2 Reports Page

- **Filter bar:** Project (multi-select), Member (multi-select), Date range, Group by (Project / Member / Date). All filters apply in real-time (debounced 300ms).
- **Summary totals row:** pinned above the table — Total hours, Billable hours, Total amount (based on hourly rate). Background `#E8E1F5`, text `#5D2B85` / weight 600.
- **Results table:** sortable columns — Member, Project, Task, Date, Duration, Billable. Export to CSV button (Ghost variant) in page header CTA position.
- PM restriction: Project and Member filters are pre-scoped to assigned projects; the PM cannot widen the scope.

### 5.3 Invoices Page

- **Invoice list:** table with columns — Invoice #, Project, Date, Hours, Amount, Status (tag), Actions.
- **Create Invoice flow:** modal dialog (not a full page). Fields: Project (dropdown), Date range, Hourly rate (pre-filled from workspace setting), Discount (%). Total amount auto-calculated and displayed prominently (`24px / weight 600`) before Save.
- Status tags use the badge variants from §2.4.

### 5.4 Members Page

- **Members table:** Avatar + Name, Email, Role (tag), Projects assigned (count), Last active, Actions (Edit role, Remove).
- **Invite member:** Primary CTA button in page header. Opens a modal — Email input, Role selector (radio: Member / PM). Submit sends invite.
- **Assign PM to project:** clicking a PM row expands an inline section listing all projects with checkboxes.

### 5.5 Projects Page

- **Project list:** table with columns — Project name (with folder icon in `#5D2B85`), Source (GitHub / Manual tag), Assigned PM, Total hours, Visibility, Actions.
- **Edit project:** inline row expansion — toggle Visibility (Active / Archived), reassign PM.
- **Create manual project:** modal — Name input, Description textarea, optional GitHub repo link.

### 5.6 Settings Page

- Single-column form layout, grouped into labeled sections separated by `1px solid #EEEEEE` dividers.
- **Workspace section:** Workspace name, Default hourly rate (number input with currency prefix).
- **Currency selector:** dropdown with ISO 4217 codes.
- Save button (Primary) pinned to bottom of each section or at page bottom.

---

## 6. Chrome Extension UI

- **Popup dimensions:** `320 × 480px` fixed.
- **Background:** Surface (`#FFFFFF`).
- **Unauthenticated state:** centered login prompt — product logo, "Sign in to GI Tiempo" heading, Primary sign-in button.
- **Authenticated, no active timer:** shows detected issue context (`org/repo#123 Issue Title` in 14px / weight 500), Start Timer button (Primary, full-width), link to open the full User SPA.
- **Authenticated, timer running:** elapsed time display (24px / weight 600 / `#5D2B85`), task name, Stop Timer button (Destructive, full-width).
- **Error / disconnected states:** inline message in Text Muted with a retry action link.
- All type, color, and spacing rules from §1 apply. No custom extension-only design tokens.

---

## 7. Shared UI Patterns

### 7.1 Modals & Dialogs

**PrimeVue component:** `<Dialog>`. Use `modal` prop for backdrop; control visibility with `v-model:visible`.

- Backdrop: PrimeVue default mask — override opacity via preset to `rgba(0,0,0,0.4)`.
- Dialog panel: `bg-surface rounded-lg shadow-modal`, max-width `max-w-lg` (form dialogs), `max-w-2xl` (content dialogs) — set via `:style="{ width: '480px' }"` or `class` on `<Dialog>`.
- Header: PrimeVue renders title from `header` slot — style as `text-lg font-semibold text-text-dark`. Close button is automatic.
- Footer: use `footer` slot — `flex justify-end gap-2`. Primary action first from right (flex-row-reverse or manual order), then Secondary/Cancel.
- Destructive dialogs: replace Primary `<Button>` with `severity="danger"`. Add a `<p class="text-sm text-text-muted mb-4">` warning line inside the content.
- Close on backdrop click: default PrimeVue behavior (`dismissableMask` prop) — enabled for non-destructive dialogs only.

```vue
<Dialog v-model:visible="showDialog" modal header="Create Invoice" :style="{ width: '480px' }">
  <template #default><!-- form content --></template>
  <template #footer>
    <Button label="Cancel" severity="secondary" text @click="showDialog = false" />
    <Button label="Save" @click="handleSave" />
  </template>
</Dialog>
```

### 7.2 Toast Notifications

**PrimeVue component:** `<Toast>` + `useToast()` composable. Register `<Toast />` once in the root `App.vue`. Call `toast.add(...)` from any component.

- Position: `position="top-right"` on `<Toast>`.
- Auto-dismiss: `life: 4000` (errors: omit `life` to require manual dismiss).
- Width: `w-80` (320px) — override via `pt` on `<Toast>`.

```typescript
// composable usage
const toast = useToast()
toast.add({ severity: 'success', summary: 'Saved', detail: 'Time entry updated.', life: 4000 })
toast.add({ severity: 'error',   summary: 'Error',  detail: 'Could not save entry.' }) // no life = manual dismiss
```

| Type | PrimeVue severity | Left accent color |
|---|---|---|
| Success | `success` | `#2E7D32` |
| Error | `error` | `#C62828` |
| Info | `info` | `var(--color-brand)` |
| Warning | `warn` | `#F57F17` |

Override the left border accent and icon in the global preset under `Toast.colorScheme.light`.

### 7.3 Confirmation Dialogs

Used before all destructive actions (delete, disconnect, remove member):

- Title: "Delete [item]?" — 18px / weight 600.
- Body: one-sentence consequence description — 14px / weight 400 / Text Muted.
- Footer: "Cancel" (Secondary) + "[Destructive label]" (Destructive variant). Destructive button is on the right.

### 7.4 Date & Time Pickers

**PrimeVue component:** `<DatePicker>` (renamed from `Calendar` in PrimeVue v4). Use `<DatePicker selectionMode="range">` for date range inputs on filter bars.

- Override active day: `background: var(--color-brand)`, text `#fff` — handled by the preset's primary color mapping.
- Range fill: `bg-accent-tint` — configure via preset.
- Time inputs: set `timeOnly` prop for standalone time pickers. Use `hourFormat="24"` for 24-hour format.
- Date + time combined: `showTime` prop on `<DatePicker>`.

```vue
<!-- Date range filter -->
<DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon />

<!-- Time-only input -->
<DatePicker v-model="startTime" timeOnly hourFormat="24" />
```

> Do **not** use two separate `<InputText>` fields for HH/MM — prefer `<DatePicker timeOnly>` to get built-in keyboard navigation and screen reader support.

### 7.5 Cascading Task Selector

**PrimeVue component:** `<Select>` (replaces `Dropdown` in PrimeVue v4) with `filter` prop enabled for type-ahead search.

Used on Timer page and anywhere a task must be chosen:

- Three sequential `<Select>` components: Organization → Project/Repo → Issue.
- Each `<Select>` has `filter` enabled (built-in type-ahead).
- A `<Select>` is `disabled` until the preceding level has a value.
- While the options list is loading, pass `:loading="true"` to `<Select>` — PrimeVue renders a spinner inside the dropdown.
- Option template via `#option` slot: primary label `font-medium` + secondary label `text-[13px] text-text-muted`.

```vue
<Select
  v-model="selectedOrg"
  :options="orgs"
  optionLabel="name"
  placeholder="Organization"
  filter
  class="w-full"
/>
<Select
  v-model="selectedProject"
  :options="projects"
  optionLabel="name"
  placeholder="Project / Repo"
  filter
  :disabled="!selectedOrg"
  :loading="loadingProjects"
  class="w-full"
>
  <template #option="{ option }">
    <span class="font-medium">{{ option.name }}</span>
    <span class="ml-2 text-[13px] text-text-muted">{{ option.type }}</span>
  </template>
</Select>
```

### 7.6 Duration Display Format

All duration values across the application must render as `Xh Ym` (e.g., `2h 15m`). Running timer displays as `HH:MM:SS`. Never show raw seconds except in the running timer.

---

## 8. Accessibility

- All interactive elements must have a visible focus indicator: `2px solid #5D2B85` outline, `2px offset`.
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG 2.1 AA).
- All form inputs must have associated `<label>` elements (not just `placeholder`).
- Icon-only buttons must have `aria-label`.
- Modals must trap focus and restore focus to the trigger element on close.
- Tables must use `<th scope="col">` and `aria-sort` for sortable columns.

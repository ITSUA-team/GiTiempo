# UI Requirements Index

Read this file first. Load only the linked section files needed for the task.

## Scope

- Stack: Tailwind CSS v4, PrimeVue v4 styled mode, Heroicons for custom icons.
- Rule: Prefer PrimeVue components for app UI and use Tailwind utility classes through tokens and `pt` overrides.
- Rule: Validate frontend form payloads and API boundaries with shared Zod schemas where a payload shape is shared or contract-facing.
- Rule: The Chrome extension uses Tailwind only and shares the same design tokens.

## Fast Start

- Need app setup or theme config: read `setup.md`.
- Need design tokens, reusable component rules, forms, or validation: read `components.md`.
- Need shell, sidebar, or responsive behavior: read `layout.md`.
- Need User SPA screens: read `pages-user.md`.
- Need Admin SPA screens: read `pages-admin.md`.
- Need extension popup or injected GitHub issue-page UI: read `chrome-ext.md`.
- Need dialogs, toasts, pickers, or selectors: read `patterns.md`.
- Need accessibility constraints: read `accessibility.md`.

## Global Decisions

- Do not use raw hex values in class attributes. Use token utilities such as `bg-brand` and `text-text-muted`.
- PrimeVue brand styling comes from the global preset first, `pt` overrides second.
- If a `pt` utility class does not apply, fix preset tokens or CSS layer order instead of adding deep selectors or `!important`.
- Use PrimeVue controls instead of raw form controls, buttons, tags, avatars, dialogs, tables, selectors, and loading widgets when the app UI has a PrimeVue equivalent.
- Use Zod schemas for shared or contract-facing frontend validation; keep API request/response parsing at shared HTTP client boundaries.
- Dark mode is disabled for MVP.
- Mobile is required, but desktop-first polish is acceptable for MVP.

## Token Summary

| Token | Tailwind utility examples | Value | Usage |
|---|---|---|---|
| Brand Purple | `bg-brand`, `text-brand`, `border-brand` | `#5D2B85` | Primary accent, active states, filled actions |
| Accent Tint | `bg-accent-tint` | `#E8E1F5` | Selected rows, soft badges, hover states |
| Surface | `bg-surface` | `#FFFFFF` | Cards, dialogs, inputs |
| App Background | `bg-app-bg` | `#F4F4F5` | Main app canvas |
| Text Dark | `text-text-dark` | `#1A1A1A` | Headings, primary body text |
| Text Muted | `text-text-muted` | `#666666` | Secondary metadata |
| Divider | `border-divider` | `#EEEEEE` | Borders and separators |
| Destructive | `text-destructive`, `border-destructive` | `#D32F2F` | Delete and disconnect actions |

## Typography Summary

| Role | Classes |
|---|---|
| H1 | `text-2xl font-semibold` |
| H2 | `text-lg font-semibold` |
| H3 | `text-base font-semibold` |
| Primary body / labels | `text-sm font-medium` |
| Secondary body / metadata | `text-[13px] font-normal` |
| Caption / helper | `text-xs font-normal` |

## Spacing And Elevation Summary

- Base spacing unit: `4px`.
- Default block gap/padding: `gap-4` / `p-4`.
- Section spacing: `gap-6` to `gap-8`.
- Shadows: `shadow-card` for cards, `shadow-popover` for overlays, `shadow-modal` for dialogs.
- Radius: `rounded-sm` for controls, `rounded-md` for dropdowns, `rounded-lg` for cards and modals.

## File Map

- `setup.md`: Tailwind theme tokens, PrimeVue preset setup, import paths, CSS layer ordering.
- `components.md`: Design tokens, component conventions, shared component-level rules.
- `layout.md`: App shell, sidebar navigation, breakpoints, page header pattern.
- `pages-user.md`: Dashboard, timer, time entries, projects, profile.
- `pages-admin.md`: Dashboard, reports, invoices, members, projects, settings.
- `chrome-ext.md`: Popup dimensions, injected page control states, and extension UI constraints.
- `patterns.md`: Dialogs, toasts, confirms, date pickers, selectors, duration format.
- `accessibility.md`: Required accessibility rules and what PrimeVue already covers.

## Agent Guidance

- For any implementation task, read only `INDEX.md` plus the smallest relevant section file set.
- Task routing:
- shell, sidebar, top bar, breakpoints, or page header work: `layout.md`
- shared component styling, forms, tables, empty/loading/error states, or token usage: `components.md`
- user-facing page structure or page-specific UI: `pages-user.md`
- admin-facing page structure or page-specific UI: `pages-admin.md`
- dialogs, toasts, selectors, pickers, and confirm flows: `patterns.md`
- accessibility-sensitive UI behavior: `accessibility.md`
- When working in `packages/web-shared`, also read the package `AGENTS.md` file and each app `AGENTS.md` file for the apps that render the shared component.
- Prefer copying examples from `setup.md` and `patterns.md` over re-deriving APIs from memory.
- If the task touches PrimeVue props or theming, confirm against current PrimeVue docs before coding.

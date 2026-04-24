<!-- Scope: shell layout, nav, breakpoints, page headers -->
<!-- Read when: building app chrome, responsive behavior, or top-level screen scaffolding -->

# Layout

## Overall Shell

User SPA and Admin SPA share the same shell:

- Top bar: `bg-surface border-b border-divider h-16`.
- Sidebar: `bg-surface border-r border-divider w-60`.
- Main content: `bg-app-bg p-6`.

### Top Bar

- Left: product logo and workspace name.
- Right: user avatar, display name, settings icon.
- When both SPAs exist, include a visible cross-link to the counterpart workspace in the top-right identity area so users can move between user-web and admin-web without changing URLs manually.

### Sidebar Navigation

- Nav item: `h-11 px-4`.
- Default: `text-sm font-medium text-text-dark`, icon `text-text-muted`.
- Hover: `hover:bg-app-bg`.
- Active: `bg-accent-tint text-brand font-semibold border-l-[3px] border-brand`.
- Group dividers: `border-t border-divider my-2`.

## Responsive Breakpoints

| Breakpoint | Width            | Tailwind prefix | Layout change                            |
| ---------- | ---------------- | --------------- | ---------------------------------------- |
| Mobile     | `< 640px`        | default         | Sidebar hidden, bottom nav up to 5 items |
| Tablet     | `640px - 1024px` | `sm:` / `md:`   | Sidebar collapses to icon-only `w-16`    |
| Desktop    | `> 1024px`       | `lg:`           | Full sidebar `w-60`                      |

MVP is desktop-first. Mobile is required but less polished.

## Page Header Pattern

Every page uses the same header block:

- Title: `text-2xl font-semibold text-text-dark`.
- Subtitle: `text-sm font-normal text-text-muted`.
- Primary CTA: right-aligned and vertically centered with the title.

<!-- Scope: shell layout, nav, breakpoints, page headers -->
<!-- Read when: building app chrome, responsive behavior, or top-level screen scaffolding -->

# Layout

## Overall Shell

User SPA and Admin SPA share the same shell:

- Top bar: `bg-surface-primary border-b border-divider h-16`.
- Sidebar: `bg-surface-primary border-r border-divider` icon-only content-fit rail on non-mobile breakpoints.
- Main content: `bg-app-bg p-6`.

### Top Bar

- Left: product logo and workspace name.
- Center: every authenticated `user-web` page top bar shows the compact timer surface on tablet and desktop. Below `640px`, the same timer ownership moves into a full-width strip directly below the mobile top row. This requirement does not apply to `admin-web`.
- The task information field inside the compact timer surface is always clickable and opens the centered task-picker dialog.
- Running state: show live `HH:MM:SS`, current `Project / Task`, clickable task information, and a single stop action.
- Not-running state: show the last tracked task context, clickable task information, and a start action that creates a new time entry for that task.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- If there is no eligible last tracked task context, keep the same compact surface, keep the task information field clickable, and disable the start action.
- While the timer summary is still loading, keep the compact surface rendered with a disabled action.
- If the timer summary fails to load, keep the compact surface rendered in a disabled fallback state and surface the failure through the standard toast flow.
- Mobile timer strip: place the Start/Stop action and Change task action in a left-side vertical stack, and render timer status, elapsed running time, and `Project / Task` metadata on the right.
- The mobile timer actions must remain outside the top-right profile menu area; if the profile menu overlaps any timer content, only non-critical task metadata may be covered.
- Right: user avatar and display name wrapped by the profile dropdown trigger.
- When both SPAs exist, include the counterpart workspace switch as the first action in the shared profile dropdown so users can move between user-web and admin-web without changing URLs manually.

### Sidebar Navigation

- Nav item: `h-11 px-4`.
- Sidebar links are icon-only in both authenticated SPAs. Do not render visible text labels in the sidebar on desktop or collapsed layouts.
- Mobile bottom navigation uses the same icon-only shared nav items; keep labels available through accessibility naming rather than visible text.
- Use the former link text as the PrimeVue tooltip copy and the accessible label on sidebar links, e.g. icon-only `Dashboard` link with tooltip `Dashboard`.
- Mobile bottom navigation keeps the same accessible label and `sr-only` text, but does not use PrimeVue tooltip because touch-triggered tooltips can persist during route navigation.
- Default: icon `text-text-muted` with an icon-only hit area that keeps the same `h-11 px-4` spacing.
- Hover: `hover:bg-app-bg`.
- Active: `bg-accent-tint text-brand font-semibold border-l-[3px] border-brand`; the active icon uses Brand Purple.
- Group dividers: `border-t border-divider my-2`.
- Authenticated `user-web` navigation no longer includes a dedicated Timer page entry; timer start/stop and task switching live in the global top-bar timer surface.

## Responsive Breakpoints

| Breakpoint | Width            | Tailwind prefix | Layout change                            |
| ---------- | ---------------- | --------------- | ---------------------------------------- |
| Mobile     | `< 640px`        | default         | Sidebar hidden, icon-only bottom nav from shared nav items |
| Tablet     | `640px - 1024px` | `sm:` / `md:`   | Sidebar uses icon-only content-fit rail  |
| Desktop    | `> 1024px`       | `lg:`           | Sidebar uses icon-only content-fit rail  |

MVP is desktop-first. Mobile is required but less polished.

## Page Header Pattern

Every page uses the same header block:

- Title: `text-2xl font-semibold text-text-dark`.
- Subtitle: `text-sm font-normal text-text-muted`.
- Primary CTA: right-aligned and vertically centered with the title.

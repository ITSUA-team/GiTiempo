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
- Center: every authenticated `user-web` page top bar shows the compact timer surface. This requirement does not apply to `admin-web`.
- The task information field inside the compact timer surface is always clickable and opens the centered task-picker dialog.
- Running state: show live `HH:MM:SS`, current `Project / Task`, clickable task information, and a single stop action.
- Not-running state: show the last tracked task context, clickable task information, and a start action that creates a new time entry for that task.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- If there is no eligible last tracked task context, keep the same compact surface, keep the task information field clickable, and disable the start action.
- While the timer summary is still loading, keep the compact surface rendered with a disabled action.
- If the timer summary fails to load, keep the compact surface rendered in a disabled fallback state and surface the failure through the standard toast flow.
- Right: counterpart workspace link, user avatar, and display name.
- When both SPAs exist, include a visible cross-link to the counterpart workspace in the top-right identity area so users can move between user-web and admin-web without changing URLs manually.

### Sidebar Navigation

- Nav item: `h-11 px-4`.
- Default: `text-sm font-medium text-text-dark`, icon `text-text-muted`.
- Hover: `hover:bg-app-bg`.
- Active: `bg-accent-tint text-brand font-semibold border-l-[3px] border-brand`.
- Group dividers: `border-t border-divider my-2`.
- Authenticated `user-web` navigation no longer includes a dedicated Timer page entry; timer start/stop and task switching live in the global top-bar timer surface.

## Responsive Breakpoints

| Breakpoint | Width            | Tailwind prefix | Layout change                            |
| ---------- | ---------------- | --------------- | ---------------------------------------- |
| Mobile     | `< 640px`        | default         | Sidebar hidden, bottom nav from shared nav items |
| Tablet     | `640px - 1024px` | `sm:` / `md:`   | Sidebar collapses to icon-only `w-16`    |
| Desktop    | `> 1024px`       | `lg:`           | Full sidebar `w-60`                      |

MVP is desktop-first. Mobile is required but less polished.

## Page Header Pattern

Every page uses the same header block:

- Title: `text-2xl font-semibold text-text-dark`.
- Subtitle: `text-sm font-normal text-text-muted`.
- Primary CTA: right-aligned and vertically centered with the title.

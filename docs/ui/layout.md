<!-- Scope: shell layout, nav, breakpoints, top-bar page context -->
<!-- Read when: building app chrome, responsive behavior, or top-level screen scaffolding -->

# Layout

## Overall Shell

User SPA and Admin SPA share the same shell:

- Top bar: `bg-surface-primary border-b border-divider h-16`.
- Sidebar: `bg-surface-primary border-r border-divider` icon-only rail on non-mobile breakpoints, with nav icon squares horizontally aligned to the top-bar logo square.
- Main content: `bg-app-bg p-6`.

### Top Bar

- Left: product logo and workspace name.
- Center: every authenticated `user-web` page top bar shows the compact timer surface on tablet and desktop. Below `640px`, the same timer ownership moves into a full-width strip directly below the mobile top row. This requirement does not apply to `admin-web`.
- The full compact timer surface is clickable, opens the centered task-picker dialog, sizes to its content, and sits right-aligned against the avatar side of the top bar instead of stretching across the center slot.
- Running state: show the current project on the first line, task on the second line, and live `HH:MM:SS` inside the same compact timer surface.
- Not-running state: show the same two-line project/task structure inside the compact timer surface instead of a shell-level start action.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- If there is no eligible last tracked task context, keep the same compact surface and leave the popup entry point available so the user can choose a task before starting.
- While the timer summary is still loading, keep the compact surface rendered with the popup entry point visible.
- If the timer summary fails to load, keep the compact surface rendered in a fallback state and surface the failure through the standard toast flow.
- Mobile timer strip: place a single `Task & timer` opener on the left, and render a two-line project/task stack on the right with elapsed running time when applicable.
- The mobile timer opener must remain outside the top-right profile menu area; if the profile menu overlaps any timer content, only non-critical task metadata may be covered.
- Right: `user-web` uses an avatar-only profile dropdown trigger with no visible member-name text; `admin-web` may continue to show identity and scope text beside the avatar.
- When the authenticated user belongs to more than one workspace, the shared profile dropdown must expose workspace switching before any app-to-app navigation actions.
- Workspace switching changes the active workspace membership for the current authenticated session. It is not the same as moving between `user-web` and `admin-web`.
- The workspace-switcher section lists the current workspace plus the user's other accessible workspaces. Selecting another workspace reissues the session token pair for that membership, refreshes shell data, and keeps the user in the current SPA only when the target role can access it.
- Keep the counterpart app link as a separate action below workspace switching so users can move between `user-web` and `admin-web` for the already active workspace without changing URLs manually.

### Sidebar Navigation

- Nav item hit area: `h-11`; visible icon shell: `size-8 rounded-lg`, matching the top-bar logo square.
- Sidebar links are icon-only in both authenticated SPAs. Do not render visible text labels in the sidebar on desktop or collapsed layouts.
- Mobile bottom navigation uses the same icon-only shared nav items; keep labels available through accessibility naming rather than visible text.
- Use the former link text as the PrimeVue tooltip copy and the accessible label on sidebar links, e.g. icon-only `Dashboard` link with tooltip `Dashboard`.
- Mobile bottom navigation keeps the same accessible label and `sr-only` text, but does not use PrimeVue tooltip because touch-triggered tooltips can persist during route navigation.
- Default: icon `text-text-muted` inside a square icon shell.
- Hover: square icon shell uses `hover:bg-app-bg`.
- Active: square icon shell uses `bg-accent-tint text-brand font-semibold`; do not add row-wide fills or edge borders.
- Group dividers: `border-t border-divider my-2`.
- Authenticated `user-web` navigation no longer includes a dedicated Timer page entry; timer start/stop and task switching live in the global top-bar timer surface.

## Responsive Breakpoints

| Breakpoint | Width            | Tailwind prefix | Layout change                            |
| ---------- | ---------------- | --------------- | ---------------------------------------- |
| Mobile     | `< 640px`        | default         | Sidebar hidden, icon-only bottom nav from shared nav items |
| Tablet     | `640px - 1024px` | `sm:` / `md:`   | Sidebar uses icon-only content-fit rail  |
| Desktop    | `> 1024px`       | `lg:`           | Sidebar uses icon-only content-fit rail  |

MVP is desktop-first. Mobile is required but less polished.

## Top-Bar Breadcrumb Pattern

Every authenticated content page uses the same compact page-context treatment in the top bar brand area:

- Leading crumb: app name.
- Trailing crumb: current page name.
- Visual treatment: breadcrumb-style inline labels in the top bar instead of a large in-content title/subtitle block.
- Page-level primary CTAs, when present, stay in their own right-aligned content action row below the top bar.

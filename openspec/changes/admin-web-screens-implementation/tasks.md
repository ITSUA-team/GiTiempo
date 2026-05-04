## 1. ProjectsView — Corrections

- [x] 1.1 Fix `MultiSelect` member label: add `memberLabel` computed that maps each member to `{ ...m, label: m.displayName ?? m.email }` and use `option-label="label"` so members without a display name show their email in chips
- [x] 1.2 Fix stat card height: add `h-24` to each of the three stat card divs to match the design's `height:96` constraint
- [x] 1.3 Fix Unarchive button colour: change from `text-destructive` to `text-brand`
- [x] 1.4 Fix filter Select width: change `class="w-64"` to `class="min-w-[200px]"` (responsive)
- [x] 1.5 Fix `formatMembersCount` for zero: return `'—'` instead of `'None'` when `assignments.length === 0`
- [x] 1.6 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`

## 2. AddProjectView — Layout Rewrite

- [x] 2.1 Remove the two-column `flex gap-6` wrapper and the right-side "Project Source" info card entirely
- [x] 2.2 Wrap the form in a single `bg-surface shadow-card rounded-lg p-5` card (matching design `padding:20` + `shadow-card`)
- [x] 2.3 Change form field labels from `text-xs font-medium tracking-wide uppercase` to `text-[12px] font-medium` (sentence-case, matching design `fontSize:12, fontWeight:500`)
- [x] 2.4 Simplify the color field: remove the `<input type="color">` browser picker and keep only the `InputText` hex input with placeholder `#000000` — or remove color field entirely if it is not visible in the design
- [x] 2.5 Ensure Cancel and Create buttons match the design: plain `<button>` elements with `border-divider bg-surface` for Cancel and `bg-brand text-surface` for Create, `px-[14px] py-[8px] rounded-[6px] text-[13px]` — consistent with ProjectsView inline edit buttons
- [x] 2.6 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`

## 3. Final Verification

- [x] 3.1 Run `pnpm --filter admin-web build` — confirm zero errors
- [x] 3.2 Manually verify both pages against the Pencil design once Pencil MCP is reconnected

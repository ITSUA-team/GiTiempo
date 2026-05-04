## Context

Both `ProjectsView.vue` and `AddProjectView.vue` are implemented but deviate from the approved Pencil design (`GITiempo.pen`, nodes `6iAjf` and `vanvg`). The design was analysed in detail from the raw `.pen` node data.

**Current deviations identified:**

### ProjectsView.vue

The implementation is largely correct but has these gaps vs the design node data:

- **`MultiSelect` label display**: `option-label="displayName"` — members with `null` displayName show blank chips. Should fall back to email.
- **Assigned members column**: design shows e.g. "2 members" — `formatMembersCount` returns "None" for 0 assigned, but design shows nothing or "—" for zero.
- **Filter select width**: currently `w-64` (fixed) — should be `min-w-[200px]` (responsive, per responsive refactor).
- **Archived "Unarchive" button color**: currently `text-destructive` — should be `text-brand` (it's a restore action, not destructive).
- **Stat card gap**: design uses `gap:8` between label and number inside each card — current uses `gap-2` (8px = correct), but the stat card height is not fixed in the design, so should use `h-[96px]` for all three to match the `height:96` on `pMJgH` stats row.

### AddProjectView.vue

- **Two-column layout does not exist in the design.** The design (`vanvg`, "Project View" frame) is a single-content-area page. The right info card ("Project Source") is not in the Pencil design.
- **Form labels**: design uses `fontSize:12, fontWeight:500` labels without uppercase tracking — current uses `text-xs font-medium tracking-wide uppercase`.
- **Card structure**: design shows a single card `bg-surface` with `padding:20, gap:16, rounded-lg` containing the form — current uses `border-divider rounded-lg border p-4`.
- **Color field**: not present in the Pencil design for the Add Project form — should be removed or made truly optional and hidden behind a toggle.
- **Back link**: design shows a `← Back to projects` text link which is present in the implementation — keep this.

## Goals / Non-Goals

**Goals:**

- Make `ProjectsView.vue` and `AddProjectView.vue` pixel-perfect to the Pencil design
- Fix the `MultiSelect` member display name fallback
- Remove the two-column info layout from `AddProjectView`
- Correct button colours and label styles

**Non-Goals:**

- Changes to any other views
- API or contract changes
- Router changes

## Decisions

### 1. AddProjectView: single-column, single card

The design shows a single `bg-surface shadow-card rounded-lg p-5` card containing the form. The right-side "Project Source" info panel is removed — it was not in the design.

### 2. Form labels: sentence-case, not uppercase

Design specifies `fontSize:12, fontWeight:500` labels. Tailwind equivalent: `text-[12px] font-medium`. No `uppercase` or `tracking-wide`.

### 3. MultiSelect displayName fallback

`option-label` on PrimeVue MultiSelect only handles a single field. Use `:option-label` with a computed label prop or add a `fullLabel` computed field to each member object that returns `displayName ?? email`.

### 4. Unarchive button: `text-brand` not `text-destructive`

Unarchive is a restorative action. Archive is destructive (red). Unarchive should be brand (purple) — same as Edit.

### 5. Stat cards height: match design `h-[96px]`

The design constrains the stats row to `height:96`. Each card should be `h-24` (96px) to match.

## Risks / Trade-offs

- **Pencil MCP unavailable** — design analysis derived from raw `.pen` node data read earlier this session. Risk: minor pixel gaps. Mitigation: verify once Pencil reconnects.
- **AddProjectView color field** — removing it would break the existing `createProject` call that can send `color`. Decision: keep the field but simplify its presentation to a single color input without the browser `<input type="color">` picker, matching a simple optional text field.

## Migration Plan

1. Fix `ProjectsView.vue` — targeted corrections only, no structural rewrite
2. Rewrite `AddProjectView.vue` template — single-column card, no info panel
3. Verify: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`

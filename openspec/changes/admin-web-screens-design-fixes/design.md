## Context

`AddProjectForm.vue` was extracted as a component during a decomposition session. Two visual corrections from the parent change (`admin-web-screens-implementation`) were not applied during extraction:

1. **Card padding**: the component uses `p-4` (16px); the Pencil design node specifies `padding:20` → `p-5`.
2. **Label typography**: `AppFormField` renders `text-[12px]` only when `size="sm"` is passed. No `AppFormField` in the form receives `size="sm"`, so all labels render at `text-[13px]` — one size larger than the design spec (`fontSize:12, fontWeight:500`). `AppInput` also hardcodes `text-[13px]` for its label, but the form uses `AppFormField` for labelled fields, so the `size="sm"` fix covers the visible labels.

Additionally, `ProjectSourceCard.vue` was created during decomposition and then removed from the render tree (per task 2.1 of the parent change), but the file was never deleted. It is dead code.

`docs/ui/pages-admin.md:36` states «Manual project creation uses a dialog», which contradicts the implemented dedicated route. This creates a drift risk for future agents reading the docs.

## Goals / Non-Goals

**Goals:**

- Align `AddProjectForm.vue` card padding with Pencil design (`p-5`)
- Align form field labels with Pencil design (`text-[12px]` via `size="sm"`)
- Remove dead file `ProjectSourceCard.vue`
- Update `docs/ui/pages-admin.md` to reflect the accepted dedicated-page creation flow

**Non-Goals:**

- Changes to `AppInput` — its label hardcoding is a separate concern; only `AppFormField`-wrapped fields are in scope
- Any logic, API, router, or shared package changes
- Other admin-web views

## Decisions

### 1. Fix `AppFormField` labels via `size="sm"` — not by changing `AppInput`

`AppInput` renders its own label at `text-[13px]` unconditionally. Changing `AppInput` to accept a `size` prop is a larger shared-component change that affects both SPAs and should be a separate change. For this fix, pass `size="sm"` only to the `AppFormField` wrappers inside `AddProjectForm`. The "Project name" field is wrapped by `AppInput` directly — its label will remain `text-[13px]` until `AppInput` is updated. This is acceptable for now; the visible mismatch is minor and bounded.

### 2. Delete `ProjectSourceCard.vue` outright

No route renders it, no test references it. Keeping it creates confusion and increases the likelihood a future agent re-connects it. Deletion is the correct action.

### 3. Update docs instead of keeping the inconsistency

`docs/ui/pages-admin.md` is the source of truth for admin UI decisions. Leaving it inconsistent with the implementation means every future spec review flags the same P1. One-line update resolves this permanently.

## Risks / Trade-offs

- **`AppInput` label not fixed** → accepted trade-off; tracked as a follow-up. The form field most likely to be noticed is the wrapping `AppFormField` label, not the `AppInput`-internal label.
- **`size="sm"` API on `AppFormField` is implicit** → `AppFormField` already supports `size?: 'sm' | 'md'` per its current implementation. No interface change needed.

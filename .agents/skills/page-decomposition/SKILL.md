# Skill: Page Decomposition

Use this skill when asked to decompose a large route-level view into focused components and composables.

---

## When to Use

- A view file exceeds ~100 lines of template or script logic
- Multiple distinct UI sections exist (header, table, empty state, etc.)
- Formatting/utility logic is mixed into the view script
- The user asks to "split", "decompose", or "componentize" a page

---

## Decomposition Rules

### 1. Identify Sections

Read the view template top to bottom. Assign each visually distinct block a component name:

| Block type               | Naming convention   | Example                  |
| ------------------------ | ------------------- | ------------------------ |
| Page header / hero info  | `<FeatureHeader>`   | `ProjectHeader.vue`      |
| Data table + empty state | `<FeatureTable>`    | `TimeEntriesTable.vue`   |
| Not-found / error card   | `<FeatureNotFound>` | `ProjectNotFound.vue`    |
| Loading skeleton         | `<FeatureSkeleton>` | `ProjectSkeleton.vue`    |
| Filter / toolbar row     | `<FeatureFilters>`  | `TimeEntriesFilters.vue` |

### 2. Component Placement

- **App-local** (only one SPA uses it): `apps/<app>/src/components/<feature>/`
- **Shared** (both SPAs): `packages/web-shared/src/components/<feature>/`
- **Route-level views** always stay in `apps/<app>/src/views/`

### 3. Props Contract

- Pass only what the component needs to render — no stores inside leaf components.
- For formatter functions pass them as props rather than importing them inside the component (keeps components testable in isolation).
- Emit events upward (`pageChange`, `delete`, etc.) with typed payloads.

```vue
<!-- Parent -->
<TimeEntriesTable
  :time-entries="timeEntries"
  :pagination="pagination"
  :format-date="formatDate"
  @page-change="onPageChange"
/>

<!-- Child defineProps -->
defineProps<{ timeEntries: TimeEntryResponse[]; pagination: { page: number;
limit: number; total: number }; formatDate: (date: string) => string; }>();
defineEmits<{ pageChange: [event: { page: number; rows: number }] }>();
```

### 4. Extract Formatters to a Composable

When 2+ format helpers exist in a view, pull them into a `use<Feature>Formatters` composable:

```ts
// composables/useProjectFormatters.ts
export function useProjectFormatters() {
  function formatDate(date: string): string { ... }
  function formatDuration(seconds: number | null): string { ... }
  function formatHours(hours: number): string { ... }
  return { formatDate, formatDuration, formatHours };
}
```

Composable placement: `apps/<app>/src/composables/` (app-local) or `packages/web-shared/src/composables/` (shared).

### 5. View Shell Pattern

After decomposition, the view should only:

1. Declare clients, stores, and route params
2. Hold reactive state
3. Define async data-loading functions
4. Render the component tree with a loading/error/content branch

```vue
<template>
  <div class="flex flex-col gap-6">
    <Button ... @click="$router.back()" />

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" style="width:40px;height:40px" />
    </div>

    <template v-else-if="data">
      <FeatureHeader :data="data" :formatted-total="formattedTotal" />
      <FeatureTable
        :items="items"
        :pagination="pagination"
        :format-date="formatDate"
        @page-change="onPageChange"
      />
    </template>

    <FeatureNotFound v-else />
  </div>
</template>
```

### 6. Empty State and Not-Found Components

- Use a standalone `<FeatureNotFound>` with no props when the empty state copy is static.
- Prefer a shared `<EmptyState>` component in `packages/web-shared` if both apps render structurally identical empty states with different copy (pass `title` and `description` as props).

### 7. Token and Style Rules

Follow `docs/ui/components.md` in every child component:

- Use token utilities (`bg-surface`, `text-text-dark`, `shadow-card`) — never raw hex.
- Cards: `bg-surface shadow-card rounded-lg`.
- Section heading: `text-lg font-semibold text-text-dark`.
- Empty state message: `text-base font-semibold text-text-dark` + `text-sm text-text-muted`.

---

## Verification Checklist

After decomposition:

- [ ] `pnpm --filter <app> lint` passes
- [ ] `pnpm --filter <app> typecheck` passes
- [ ] View file is ≤ ~80 lines of template
- [ ] No store imports inside leaf display components
- [ ] All formatter functions extracted to a composable
- [ ] Emits are typed (no `any`)
- [ ] Token utilities used — no raw hex values

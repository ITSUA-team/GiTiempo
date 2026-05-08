<!-- Scope: dialogs, toasts, confirms, date pickers, selectors, duration format -->
<!-- Read when: implementing shared interactive patterns across screens -->

# Shared Patterns

## Modals And Dialogs

Use PrimeVue `<Dialog>`.

- Backdrop opacity is overridden in the preset.
- Dialog panel uses `bg-surface rounded-lg shadow-modal`.
- Common widths: 480px for forms, larger for content-heavy dialogs.
- Footer uses `flex justify-end gap-2`.
- Destructive dialogs use `severity="danger"` for the main action.
- `dismissableMask` stays enabled only for non-destructive dialogs.

```vue
<Dialog v-model:visible="showDialog" modal header="Create Invoice" :style="{ width: '480px' }">
  <template #default><!-- form content --></template>
  <template #footer>
    <Button label="Cancel" severity="secondary" variant="text" @click="showDialog = false" />
    <Button label="Save" @click="handleSave" />
  </template>
</Dialog>
```

## Toast Notifications

Use `<Toast>` and `useToast()`.

- Position: top right.
- Success/info/warn auto-dismiss after 4000ms.
- Errors require manual dismiss.
- Width target: `w-80`.

```typescript
const toast = useToast()
toast.add({ severity: 'success', summary: 'Saved', detail: 'Time entry updated.', life: 4000 })
toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save entry.' })
```

## Confirmation Dialogs

Use `<ConfirmDialog>` and `useConfirm()`.

- Required before destructive actions.
- Title uses `text-lg font-semibold`.
- Body uses `text-sm text-text-muted`.
- Footer order: cancel then destructive accept on the right.
- Keep the `<ConfirmDialog>` host at the route, page-shell, or app-shell level. Do not hide global confirmation hosts inside leaf presentational components such as cards, rows, or fields just because only one local action currently needs confirmation.
- Leaf components may emit events or call composables that use `useConfirm()`, but the rendered confirm host should stay with the surface that owns page-level infrastructure.

```typescript
const confirm = useConfirm()
confirm.require({
  message: 'This time entry will be permanently deleted.',
  header: 'Delete entry?',
  acceptLabel: 'Delete',
  rejectLabel: 'Cancel',
  acceptProps: {
    severity: 'danger',
  },
  accept: () => handleDelete(entryId),
})
```

## Date And Time Pickers

Use `<DatePicker>`.

- Date range filters use `selectionMode="range"`.
- Time-only fields use `timeOnly` and `hourFormat="24"`.
- Date and time combined uses `showTime` and should be used for time-entry create and edit forms that submit `startedAt` and `endedAt` ISO datetimes.
- Do not split HH/MM into separate text inputs.

```vue
<DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon />
<DatePicker v-model="startTime" timeOnly hourFormat="24" />
```

## Cascading Task Selector

Use sequential PrimeVue `<Select>` controls.

- Project -> Task.
- Enable `filter` on each select.
- Disable each level until the previous one has a value.
- Use `:loading` while downstream options are fetched.

```vue
<Select
  v-model="selectedProject"
  :options="projects"
  optionLabel="name"
  placeholder="Project"
  filter
  class="w-full"
/>
<Select
  v-model="selectedTask"
  :options="tasks"
  optionLabel="title"
  placeholder="Task"
  filter
  :disabled="!selectedProject"
  :loading="loadingTasks"
  class="w-full"
/>
```

## Task Lookup

Use PrimeVue `<AutoComplete>` when the UI helps the user find a task by title but the API still expects a selected task id.

- Time Entries task filter uses `<AutoComplete>` instead of a raw text input.
- Manual time-entry create forms should also use `<AutoComplete>` for task selection once the project context is known.
- Suggestions should be visible tasks for the current user and may be narrowed by the selected project.
- The applied API filter or payload still uses the selected task's `taskId`; do not document this as a backend free-text search query.
- Use `forceSelection` so the submitted value always maps to a real task option.

```vue
<AutoComplete
  v-model="selectedTask"
  :suggestions="taskSuggestions"
  optionLabel="title"
  placeholder="Search tasks"
  forceSelection
  dropdown
  class="w-full"
/>
```

## Time Entry Dialogs

Use PrimeVue `<Dialog>` for both manual time-entry create and edit flows.

- The header-level and day-level `+ New time entry` actions should open the shared dialog in create mode.
- The day-level create action pre-populates the selected day in the form.
- Row-level `Edit` actions should open the same shared dialog in edit mode.
- Edit mode pre-fills the selected entry's current project, task, `startedAt`, `endedAt`, description, and `isBillable` state.
- Required fields follow the time-entry form contract: project, task, `startedAt`, and `endedAt`.
- Optional fields are description and `isBillable`.
- Use PrimeVue `<Textarea>` for description and `<Checkbox binary>` for billable state.
- Default copy differs by mode: create uses `New time entry` and `Save entry`; edit uses `Edit time entry` and `Save changes`.
- The design mockup may live as a separate reference frame, but implementation must render it as an actual modal popup, not as inline page content.

## Multi-Select Filters

Use `<MultiSelect>` with `filter` and `display="chip"`.

```vue
<MultiSelect
  v-model="selectedProjects"
  :options="projects"
  optionLabel="name"
  placeholder="All projects"
  filter
  display="chip"
  :maxSelectedLabels="2"
  class="w-full"
/>
```

## Duration Format

- Default duration format: `Xh Ym`.
- Running timer format: `HH:MM:SS`.
- Never show raw seconds outside the running timer.

## Compact Top-Bar Timer

- Use this surface in the center area of every authenticated `user-web` top bar. Do not apply it to `admin-web` unless the docs are updated explicitly.
- Running state shows the running label, live `HH:MM:SS`, current `Project / Task`, and one stop action.
- Not-running state shows the last tracked task context and one start action that creates a new time entry for that task.
- Last tracked task context means the most recent own time entry whose task and parent project are still visible and active for the current user.
- A completed timer entry or manual entry may seed the last tracked task context if the task remains trackable.
- The `Start` action always creates a fresh running time entry. It must not resume or mutate the previous time entry record.
- If there is no eligible last tracked task context, keep the same not-running surface and disable the start action.
- While the timer summary is loading, render the same surface shape with the action disabled.
- If the timer summary fails to load, keep the surface shape visible, disable the action, and use standard toast feedback for the failure.
- Keep the component compact enough to fit the existing `h-16` top bar.
- Hide or truncate the context text first on smaller widths before compressing the elapsed-time value or removing the action.

## Pagination

Use PrimeVue `<Paginator>`.

- Place it below the primary list or grouped results region.
- Time Entries page uses a compact layout with previous/next buttons, page links, and a current-page report.
- Keep the current-page report in muted body text.
- Use the active page as the primary brand-filled state.

```vue
<Paginator
  :rows="10"
  :totalRecords="120"
  template="PrevPageLink PageLinks NextPageLink CurrentPageReport"
  currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
/>
```

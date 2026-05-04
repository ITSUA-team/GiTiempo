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
- Date and time combined uses `showTime`.
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

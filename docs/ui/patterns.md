<!-- Scope: dialogs, toasts, confirms, date pickers, selectors, duration format -->
<!-- Read when: implementing shared interactive patterns across screens -->

# Shared Patterns

## Modals And Dialogs

Use PrimeVue `<Dialog>`.

- Backdrop opacity is overridden in the preset.
- Dialog panel uses `bg-surface-primary rounded-lg shadow-modal`.
- Common widths: 480px for forms, larger for content-heavy dialogs.
- Footer uses `flex justify-end gap-2` and contains the primary action only for non-destructive form dialogs unless the dialog owns contextual entity actions that should not stay in a table row.
- Non-destructive form dialogs rely on the built-in top-right close control for dismissal instead of a footer `Cancel` button.
- Destructive dialogs use `severity="danger"` for the main action.
- `dismissableMask` stays enabled only for non-destructive dialogs.

```vue
<Dialog v-model:visible="showDialog" modal header="Invoice" :style="{ width: '480px' }">
  <template #default><!-- form content --></template>
  <template #footer>
    <Button label="Save" @click="handleSave" />
  </template>
</Dialog>
```

## Toast Notifications

Use `<Toast>` and `useToast()`.

- Render exactly one `<Toast>` service host in the root `App.vue` of each SPA.
- Do not render Toast hosts in shells, routes, pages, or leaf components.
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

- Render exactly one `<ConfirmDialog>` service host in the root `App.vue` of each SPA.
- Do not render ConfirmDialog hosts in shells, routes, pages, rows, cards, fields, or other leaf components.
- Required before destructive actions.
- Title uses `text-lg font-semibold`.
- Body uses `text-sm text-text-muted`.
- Footer order: cancel then destructive accept on the right.
- Leaf components may emit events or call composables that use `useConfirm()`, but the rendered confirm host stays with the root app infrastructure.

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

## Billable Default Update Dialogs

Use PrimeVue `<Dialog>` for non-destructive propagation choices after a project or task default billable value changes.

- Show this popup only when the edited project or task already has downstream records that can inherit the changed default.
- The new default value is already saved for future records before this popup appears.
- Project variant title: `Update project billable default?`
- Task variant title: `Update task billable default?`
- Project variant offers checkbox choices for updating existing tasks in the project and existing time entries in the project.
- Task variant offers a checkbox choice for updating existing time entries for the task.
- Dismissing the popup leaves existing records unchanged.
- Primary action is `Update existing records`.
- These popups are follow-up dialogs for inheritance propagation only. They do not replace the normal project or task save surface.

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

Use sequential PrimeVue `<AutoComplete dropdown forceSelection>` controls.

- Project -> Task.
- Use PrimeVue `<AutoComplete dropdown forceSelection>` for each level.
- Disable each level until the previous one has a value.
- Use `:loading` while downstream options are fetched.
- For the top-bar timer picker, visible workspace-local projects are listed first and connected-user GitHub-backed project or repository sources are appended after them when a GitHub account is connected.
- Disconnected GitHub state must not block workspace-local project/task selection.
- This pattern is used inside the centered top-bar task-picker dialog.

```vue
<AutoComplete
  v-model="selectedProject"
  :suggestions="projectSuggestions"
  optionLabel="name"
  placeholder="Project"
  forceSelection
  dropdown
  class="w-full"
/>
<AutoComplete
  v-model="selectedTask"
  :suggestions="taskSuggestions"
  optionLabel="title"
  placeholder="Task"
  forceSelection
  dropdown
  :disabled="!selectedProject"
  :loading="loadingTasks"
  class="w-full"
/>
```

## Task Lookup

Use PrimeVue `<AutoComplete>` when the UI helps the user find or filter tasks by title.

- Time Entries task filter uses `<AutoComplete>` instead of a raw text input.
- Manual time-entry create forms should also use `<AutoComplete>` for task selection once the project context is known.
- Time Entries filter suggestions should come from currently loaded filtered entries so hints match the active date/project/list filters. Create/edit task suggestions should be visible tasks for the current user and may be narrowed by the selected project.
- Suggestion overlays must stay within the mobile viewport and truncate long task/project labels instead of expanding off-page.
- Time Entries list filtering may send backend `search` so task-title filtering applies across the paginated result set.
- Create, edit, and timer payloads still submit a selected task's `taskId`; use `forceSelection` when the submitted value must map to a real task option.

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

## User Projects Filters

Use a lightweight filter set for the user Projects page.

- Keep a combined PrimeVue `<AutoComplete>` search field with placeholder copy `Search projects or tasks`.
- Suggestions include both project names and task names from the currently loaded visible data set.
- Project suggestions render their main label in bold so they are visually distinct from task suggestions.
- Add a `Status` PrimeVue `<Select>` with `All statuses`, `Open`, and `Closed`.
- Add an `Updated` PrimeVue `<Select>` with `Any time`, `Today`, `Last 7 days`, and `Older`.
- All filters operate on frontend-visible data only. Do not document them as backend search or backend filter endpoints.
- Project-name matches keep the full matching project group visible.
- Task-name matches keep the parent project visible and narrow visible task rows to the matching tasks.
- `Status` and `Updated` continue narrowing task rows after the text search is applied and remove project groups that no longer have matching tasks.
- Clearing the search and resetting the status and updated selects restores the full grouped list.

## Entry Action Icons

Use icon-only create-entry actions when the surrounding section title already provides the entity context.

- User views use filled primary square actions for day-level and project-level create entry points.
- Admin table headers use filled primary square actions for create/invite entry points.
- Match the icon to the entity when possible; use a generic `plus` only when the surrounding header already makes the entity obvious.
- Every icon-only action still needs visible tooltip text and an accessible label that keeps the original action verb explicit.

## External Task Links

Use a separate icon-only external link next to the task name when the task is backed by a synced GitHub issue.

- Keep the task name behavior intact; the external-link icon must not replace the existing edit or selection click target on the task label itself.
- The icon opens the source GitHub issue in a new browser tab.
- Use a compact `arrow-up-right` style icon aligned to the task name baseline or centerline without adding a full button treatment around the row.
- Show this icon only for externally linked tasks. Local/manual tasks do not render it.

## Time Entry Dialogs

Use PrimeVue `<Dialog>` for both manual time-entry create and edit flows.

- The header-level and day-level icon-only `New time entry` actions should open the shared dialog in create mode.
- The day-level create action pre-populates the selected day in the form.
- The row task/title click target should open the same shared dialog in edit mode.
- Edit mode pre-fills the selected entry's current project, task, `startedAt`, `endedAt`, description, and `isBillable` state.
- Required fields follow the time-entry form contract: project, task, `startedAt`, and `endedAt`.
- Optional fields are description and `isBillable`.
- Create mode initializes `isBillable` from the selected task's default billable value and still allows a per-entry override before save.
- Use PrimeVue `<Textarea>` for description and `<Checkbox binary>` for billable state.
- Default copy differs by mode: create uses `New time entry` and `Save entry`; edit uses `Edit time entry` and `Save changes`.
- Edit mode should include the destructive delete action inside the dialog instead of in the table row.
- The design mockup may live as a separate reference frame, but implementation must render it as an actual modal popup, not as inline page content.

## Top-Bar Timer Task Picker

Use PrimeVue `<Dialog>` as a centered modal popup opened from the compact top-bar timer surface.

- The full compact top-bar timer surface is always clickable, including when the current timer summary is loading, unavailable, or not yet startable.
- The dialog is the primary place to switch the selected task context and to trigger timer start/stop behavior in `user-web`.
- Use `Project -> Task` selection for task targeting.
- Use sequential PrimeVue `<AutoComplete dropdown forceSelection>` controls for project and task selection.
- Project options list visible workspace-local projects first, then connected-user GitHub-backed repository and Project V2 sources when the user has a connected GitHub account.
- When no GitHub account is connected, keep the workspace-local selector flow valid and do not show disconnected GitHub state as a project/task request failure.
- The selected workspace project must be visible to the current user.
- The selected workspace task must belong to the selected visible workspace project.
- Selecting a GitHub-backed source loads visible GitHub issue candidates for that source, then resolves the selected issue to a local timer task target before timer start or running-task update.
- For workspace-local projects, the `Task` select lists visible tasks first and appends `New task` as the last option.
- GitHub-backed task lists do not include manual `New task` creation.
- When `Task = New task`, the created task inherits the selected workspace project's default billable value.
- The dialog includes an optional `Description` field directly below `Task`; it is a time-entry note, not task metadata.
- Use PrimeVue `<Textarea>` for the description field.
- When the timer is idle, the popup primary action is `Start timer`, and the selected task and description become the draft for the new running entry. There is no separate shell-level start button outside the popup.
- The running-entry draft initializes `isBillable` from the selected task's default billable value.
- When the timer is already running, secondary `Change task` updates the running entry's task and description without stopping the timer, and primary `Stop timer` sits to its right in the same popup. These actions do not reappear as separate shell-level controls.
- The dialog supports creating a new task inside the currently selected visible workspace project through the `Task` select.
- Do not support creating a new project from this dialog.
- When `Task` is set to `New task`, show a single required task-title input directly below the task select, backed by the existing task-create contract.
- When task creation succeeds, keep the dialog open with the new task selected and let the user confirm with the state-appropriate timer action.
- The dialog must clearly show that the new-task input is conditional on `Task = New task`, so the user always knows whether they are picking an existing task or creating a new one.
- On mobile, keep the task-picker dialog near full width, block background scroll, make the dialog content scrollable, and stack the conditional new-task input plus timer-action rows so Project -> Task selection remains usable in the mobile timer flow. The footer primary action is full width on mobile.
- Loading, empty, validation-error, and request-error states must stay distinct.
- The dialog must not include manual interval entry controls; manual entry remains on Time Entries only.
- Starting from the compact timer always creates a fresh running time entry for the currently selected task context.

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

- This compact center-area surface is the tablet/desktop timer pattern for authenticated `user-web` top bars. Do not apply it to `admin-web` unless the docs are updated explicitly.
- Below `640px`, do not squeeze the compact center-area surface into the top row; use the mobile timer strip defined in `docs/ui/layout.md` while keeping the same state model, task-picker behavior, and accessibility requirements.
- Running state shows project on the first line, task on the second line, and live `HH:MM:SS` inside one clickable compact timer surface that leads into the popup-owned timer actions.
- Not-running state shows the same two-line project/task structure in the clickable compact timer surface instead of a shell-level start action.
- The compact timer surface sits against the avatar side of the header center area at content width instead of stretching across the center slot.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- A completed timer entry or manual entry may seed the last tracked task context if the task remains trackable.
- The popup `Start timer` action always creates a fresh running time entry. It must not resume or mutate the previous time entry record.
- Clicking the compact timer surface opens the centered task-picker dialog.
- If there is no eligible last tracked task context, keep the same not-running surface and keep the compact timer surface clickable so the popup can seed a new startable task context.
- While the timer summary is loading, render the same surface shape with the popup entry point visible.
- If the timer summary fails to load, keep the surface shape visible and use standard toast feedback for the failure.
- Keep the tablet/desktop compact component at content width so it still fits the existing `h-16` top bar and stays aligned to the avatar side without stretching across the center slot.
- Hide or truncate the context text first on smaller tablet/desktop widths before compressing the elapsed-time value inside the running surface.

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

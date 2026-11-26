<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, onBeforeUnmount } from 'vue';
import { type TimeEntryResponse } from '@gitiempo/shared';
import { giTiempoAnchorWidthOverlayClass, giTiempoAutoCompleteDropdownPt, giTiempoDatePickerPt, giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';
import { AppDialog, DatePickerButtonBar, filterAutocompleteOptions, getErrorMessage, useDatePickerConfirmCancel } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { managedMemberOptions } from '@/components/time-entries/managed-member-options';
import { managedTaskOptions, type ManagedTaskChoice } from '@/components/time-entries/managed-task-options';
import type {
  AdminTimeEntriesClient,
  ManagedEntryCreate,
  ManagedEntryUpdate,
  ManagementMember,
  ManagementProject,
  ManagementTask,
} from '@/services/admin-time-entries-client';

const props = defineProps<{
  client: AdminTimeEntriesClient;
  project: ManagementProject;
  projects: ManagementProject[];
  entry?: TimeEntryResponse;
  busy: boolean;
  accessUnverified: boolean;
  projectAccessError: string;
  locked: boolean;
  error: string;
  choicesRefresh: number;
}>();

const emit = defineEmits<{
  close: [];
  create: [projectId: string, input: ManagedEntryCreate];
  update: [input: ManagedEntryUpdate];
  scopeLost: [];
  accessCheck: [];
  retryAccess: [];
}>();

const visible = defineModel<boolean>('visible', { required: true });
const entry = props.entry;
const draftProjectId = shallowRef(props.project.id);
const projectOptions = computed(() => props.projects.filter(project => project.isActive || project.id === entry?.projectId));
const draftProject = computed(() => projectOptions.value.find(project => project.id === draftProjectId.value));
const activeDraftProjectId = computed(() => draftProject.value?.isActive ? draftProject.value.id : undefined);
type MemberOption = ManagementMember & { label: string };
const originalMember = entry ? { ...entry.user, label: entry.user.displayName || entry.user.email } : null;
const memberModel = shallowRef<MemberOption | string | null>(originalMember);
const taskModel = shallowRef<ManagedTaskChoice | string | null>(entry?.task ?? null);
const userId = computed(() => typeof memberModel.value === 'object' ? memberModel.value?.id : undefined);
const taskId = computed(() => typeof taskModel.value === 'object' ? taskModel.value?.id : undefined);
const originalProject = computed(() => Boolean(entry && draftProject.value?.id === entry.projectId));
const originalPair = computed(() => originalProject.value && userId.value === entry?.userId && taskId.value === entry?.taskId);
const memberSearch = shallowRef({ query: '' });
const taskSearch = shallowRef({ query: '' });
const start = ref<Date | null>(entry ? new Date(entry.startedAt) : null);
const end = ref<Date | null>(entry?.endedAt ? new Date(entry.endedAt) : null);
const startPicker = useDatePickerConfirmCancel<Date>();
const endPicker = useDatePickerConfirmCancel<Date>();
const dialogAutoCompletePt = {
  ...giTiempoAutoCompleteDropdownPt,
  clearIcon: { class: 'bg-surface-primary end-10 box-content' },
  overlay: {
    ...giTiempoAutoCompleteDropdownPt.overlay,
    class: [giTiempoAutoCompleteDropdownPt.overlay?.class, 'max-w-[calc(100vw-2rem)]'].join(' '),
  },
  pcInputText: {
    ...giTiempoAutoCompleteDropdownPt.pcInputText,
    root: {
      ...giTiempoAutoCompleteDropdownPt.pcInputText?.root,
      class: [giTiempoAutoCompleteDropdownPt.pcInputText?.root?.class, '[.p-autocomplete-clearable_&]:pr-7'].join(' '),
    },
  },
};
const taskAutoCompletePt = {
  ...dialogAutoCompletePt,
  // PrimeVue anchors to the input. Include the trigger width and keep long labels inside the panel.
  overlay: { class: `${giTiempoAnchorWidthOverlayClass} box-content pr-9` },
  listContainer: { class: '-mr-9 overflow-x-hidden' },
  list: { class: 'px-0' },
};
const description = ref(entry?.description ?? '');
const isBillable = ref(entry?.isBillable ?? false);
const tasks = shallowRef<ManagementTask[]>([]);
const members = shallowRef<ManagementMember[]>([]);
const tasksLoading = ref(false);
const membersLoading = ref(false);
const tasksError = ref('');
const membersError = ref('');
const checkingAssignment = ref(false);
const validationAttempted = ref(false);
let taskRequest = 0;
let memberRequest = 0;

const taskOptions = computed(() => {
  if (entry && originalProject.value && (!userId.value || userId.value === entry.userId)
    && !tasks.value.some(task => task.id === entry.taskId)) return managedTaskOptions([entry.task, ...tasks.value]);
  return managedTaskOptions(tasks.value);
});
const displayedTask = computed(() => {
  const task = taskModel.value;
  if (!task || typeof task === 'string') return task;
  return taskOptions.value.find(option => option.id === task.id) ?? { ...task, label: task.title };
});
const memberOptions = computed(() => {
  if (entry && originalProject.value && (!taskId.value || taskId.value === entry.taskId)
    && !members.value.some(member => member.id === entry.userId)) {
    return managedMemberOptions([entry.user, ...members.value]);
  }
  return managedMemberOptions(members.value);
});
const memberSuggestions = computed(() => filterAutocompleteOptions(memberOptions.value, memberSearch.value.query, member => member.label));
const taskSuggestions = computed(() => filterAutocompleteOptions(taskOptions.value, taskSearch.value.query, task => task.label));
const fieldsDisabled = computed(() => props.busy || props.locked || props.accessUnverified);
const validTask = computed(() => originalPair.value || tasks.value.some(task => task.id === taskId.value));
const validMember = computed(() => originalPair.value || members.value.some(member => member.id === userId.value));
const choicesPending = computed(() => !draftProject.value || checkingAssignment.value
  || (!originalPair.value && (tasksLoading.value || membersLoading.value)));
const memberError = computed(() => validationAttempted.value && !validMember.value ? 'Select an eligible member.' : '');
const taskError = computed(() => validationAttempted.value && !validTask.value ? 'Select a task.' : '');
const startError = computed(() => validationAttempted.value && !start.value ? 'Enter a start time.' : '');
const endError = computed(() => {
  if (!validationAttempted.value) return '';
  if (!end.value) return 'Enter an end time.';
  if (start.value && !(end.value.getTime() > start.value.getTime())) {
    return 'The end must be later than the start.';
  }
  return '';
});

function requiredFieldPt<T extends typeof giTiempoDatePickerPt | typeof giTiempoAutoCompleteDropdownPt>(
  base: T,
  describedBy?: string,
) {
  return {
    ...base,
    pcInputText: {
      ...base.pcInputText,
      root: { ...base.pcInputText?.root, 'aria-required': true, 'aria-describedby': describedBy },
    },
  };
}

async function loadTasks() {
  const request = ++taskRequest;
  const projectId = activeDraftProjectId.value;
  const selectedUser = userId.value;
  const current = () => request === taskRequest
    && projectId === activeDraftProjectId.value && selectedUser === userId.value;
  tasks.value = [];
  tasksError.value = '';
  tasksLoading.value = Boolean(projectId);
  if (!projectId) return;
  try {
    const result = await props.client.tasks(projectId, selectedUser, current);
    if (!current()) return;
    if (checkingAssignment.value) {
      checkingAssignment.value = false;
      if (!result.isOwnerAssigned) {
        memberModel.value = null;
        return;
      }
    }
    tasks.value = result.items;
    if (taskId.value && !validTask.value) {
      selectTask(null);
    }
  } catch (error) {
    if (!current()) return;
    if (isApiErrorStatus(error, [401, 403])) emit('scopeLost');
    else if (!(originalPair.value && isApiErrorStatus(error, [422]))) {
      tasksError.value = getErrorMessage(error, 'Unable to load eligible tasks.');
      if (isApiErrorStatus(error, [404])) emit('accessCheck');
    }
  } finally {
    if (current()) tasksLoading.value = false;
  }
}

async function loadMembers() {
  const request = ++memberRequest;
  const projectId = activeDraftProjectId.value;
  const selectedTask = taskId.value;
  const current = () => request === memberRequest
    && projectId === activeDraftProjectId.value && selectedTask === taskId.value;
  members.value = [];
  membersError.value = '';
  membersLoading.value = Boolean(projectId);
  if (!projectId) return;
  try {
    const result = await props.client.members(projectId, 'create', current, selectedTask);
    if (current()) members.value = result;
  } catch (error) {
    if (!current()) return;
    if (isApiErrorStatus(error, [401, 403])) emit('scopeLost');
    else {
      membersError.value = getErrorMessage(error, 'Unable to load eligible members.');
      if (isApiErrorStatus(error, [404])) emit('accessCheck');
    }
  } finally {
    if (current()) membersLoading.value = false;
  }
}

watch(draftProject, project => {
  if (entry && project?.id === entry.projectId && !project.isActive) {
    selectMember(originalMember);
    selectTask(entry.task);
  }
});
watch([userId, activeDraftProjectId, () => props.choicesRefresh], loadTasks, { immediate: true });
watch([taskId, activeDraftProjectId, () => props.choicesRefresh], loadMembers, { immediate: true });
watch(memberOptions, options => {
  const selected = options.find(member => member.id === userId.value);
  if (selected && typeof memberModel.value === 'object' && memberModel.value?.label !== selected.label) {
    memberModel.value = selected;
  }
});
onBeforeUnmount(() => {
  taskRequest += 1;
  memberRequest += 1;
});

function revealError(element: Element) {
  element.scrollIntoView?.({ block: 'nearest' });
}

function selectProject(projectId: string) {
  if (projectId === draftProjectId.value) return;
  checkingAssignment.value = Boolean(userId.value);
  draftProjectId.value = projectId;
  selectTask(null);
  memberSearch.value = { query: '' };
  taskSearch.value = { query: '' };
}

function selectMember(value: MemberOption | string | null) {
  checkingAssignment.value = false;
  memberModel.value = value;
}

function selectTask(value: ManagedTaskChoice | string | null) {
  taskModel.value = value;
  if (!entry && typeof value === 'object') {
    isBillable.value = tasks.value.find(task => task.id === value?.id)?.defaultBillableForTimeEntries ?? false;
  }
}

async function submit(event: SubmitEvent) {
  if (fieldsDisabled.value || choicesPending.value) return;
  validationAttempted.value = true;
  if (!userId.value || !validMember.value || !taskId.value || !validTask.value || !start.value || !end.value || endError.value) {
    const form = event.currentTarget;
    await nextTick();
    if (form instanceof HTMLFormElement) {
      form.querySelector<HTMLInputElement>('input[aria-invalid="true"]:enabled')?.focus();
    }
    return;
  }
  const startedAt = start.value.toISOString();
  const endedAt = end.value.toISOString();
  const notes = description.value || null;
  if (!entry) {
    emit('create', draftProjectId.value, { userId: userId.value, taskId: taskId.value, startedAt, endedAt, description: notes, isBillable: isBillable.value });
    return;
  }

  const input: ManagedEntryUpdate = {};
  if (draftProjectId.value !== entry.projectId) input.projectId = draftProjectId.value;
  if (userId.value !== entry.userId) input.userId = userId.value;
  if (input.projectId || taskId.value !== entry.taskId) input.taskId = taskId.value;
  if (start.value.getTime() !== Date.parse(entry.startedAt)) input.startedAt = startedAt;
  if (end.value.getTime() !== Date.parse(entry.endedAt ?? '')) input.endedAt = endedAt;
  if (description.value !== (entry.description ?? '')) input.description = notes;
  if (isBillable.value !== entry.isBillable) input.isBillable = isBillable.value;
  if (Object.keys(input).length === 0) {
    visible.value = false;
    return;
  }
  emit('update', input);
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    :header="entry ? 'Edit time entry' : 'New time entry'"
    :closable="!busy"
    :close-on-escape="!busy"
    :dismissable-mask="!busy"
    modal
    class="w-xl"
    @after-hide="emit('close')"
  >
    <form
      id="managed-entry-form"
      class="flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-1.5">
          <label
            id="managed-entry-project-label"
            for="managed-entry-project"
            class="text-sm font-medium"
          >
            Project
          </label>
          <Select
            input-id="managed-entry-project"
            aria-labelledby="managed-entry-project-label"
            :model-value="draftProjectId"
            :options="projectOptions"
            option-label="name"
            option-value="id"
            placeholder="Select a project"
            :pt="giTiempoFieldWidthSelectPt"
            :disabled="fieldsDisabled"
            fluid
            @update:model-value="selectProject"
          />
          <small
            v-if="!draftProject"
            class="text-destructive text-xs"
            role="status"
          >Choose an active project you can manage.</small>
        </div>
        <div class="flex min-w-0 flex-col gap-1.5">
          <label
            for="managed-entry-member"
            class="text-sm font-medium"
          >
            Member
          </label>
          <AutoComplete
            input-id="managed-entry-member"
            class="w-full"
            :pt="requiredFieldPt(dialogAutoCompletePt, memberError ? 'managed-entry-member-error' : undefined)"
            :suggestions="memberSuggestions"
            :model-value="memberModel"
            complete-on-focus
            data-key="id"
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            placeholder="Select a member"
            empty-search-message="No matching eligible members"
            :loading="membersLoading || (checkingAssignment && tasksLoading)"
            :disabled="fieldsDisabled || membersLoading || (checkingAssignment && tasksLoading) || !activeDraftProjectId"
            :show-clear="Boolean(entry && userId)"
            :invalid="Boolean(memberError)"
            fluid
            @complete="memberSearch = $event"
            @update:model-value="selectMember"
          />
          <small
            v-if="memberError"
            id="managed-entry-member-error"
            class="text-destructive text-xs"
          >{{ memberError }}</small>
        </div>
      </div>
      <div class="flex min-w-0 flex-col gap-1.5">
        <label
          for="managed-entry-task"
          class="text-sm font-medium"
        >
          Task
        </label>
        <AutoComplete
          input-id="managed-entry-task"
          :pt="requiredFieldPt(taskAutoCompletePt, taskError ? 'managed-entry-task-error' : undefined)"
          :model-value="displayedTask"
          :suggestions="taskSuggestions"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          force-selection
          :min-length="0"
          option-label="label"
          placeholder="Select a task"
          empty-search-message="No matching eligible tasks"
          :loading="tasksLoading"
          :disabled="tasksLoading || fieldsDisabled || !activeDraftProjectId"
          :show-clear="Boolean(entry && taskId)"
          :invalid="Boolean(taskError)"
          fluid
          @complete="taskSearch = $event"
          @update:model-value="selectTask"
        >
          <template #option="{ option }">
            <span
              class="min-w-0 truncate"
              :title="option.label"
            >{{ option.label }}</span>
          </template>
        </AutoComplete>
        <small
          v-if="taskError"
          id="managed-entry-task-error"
          class="text-destructive text-xs"
        >{{ taskError }}</small>
      </div>
      <RequestErrorCard
        v-if="membersError && !accessUnverified"
        title="Failed to load members"
        :message="membersError"
        @retry="loadMembers"
      />
      <RequestErrorCard
        v-if="tasksError && !accessUnverified"
        title="Failed to load tasks"
        :message="tasksError"
        @retry="loadTasks"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-1.5">
          <label
            for="managed-entry-start"
            class="text-sm font-medium"
          >
            Start
          </label>
          <DatePicker
            :ref="startPicker.datePickerRef"
            v-model="start"
            input-id="managed-entry-start"
            placeholder="Start date and time"
            date-format="dd M yy"
            :pt="requiredFieldPt(giTiempoDatePickerPt, startError ? 'managed-entry-start-error' : undefined)"
            :manual-input="false"
            show-button-bar
            show-icon
            icon-display="input"
            show-time
            show-seconds
            hour-format="24"
            :disabled="fieldsDisabled"
            :invalid="Boolean(startError)"
            fluid
            @show="startPicker.handleShow"
          >
            <template #buttonbar>
              <DatePickerButtonBar
                @cancel="startPicker.handleCancel"
                @confirm="startPicker.handleConfirm"
              />
            </template>
          </DatePicker>
          <small
            v-if="startError"
            id="managed-entry-start-error"
            class="text-destructive text-xs"
          >{{ startError }}</small>
        </div>
        <div class="flex min-w-0 flex-col gap-1.5">
          <label
            for="managed-entry-end"
            class="text-sm font-medium"
          >
            End
          </label>
          <DatePicker
            :ref="endPicker.datePickerRef"
            v-model="end"
            input-id="managed-entry-end"
            placeholder="End date and time"
            date-format="dd M yy"
            :pt="requiredFieldPt(giTiempoDatePickerPt, endError ? 'managed-entry-end-error' : undefined)"
            :manual-input="false"
            show-button-bar
            show-icon
            icon-display="input"
            show-time
            show-seconds
            hour-format="24"
            :disabled="fieldsDisabled"
            :invalid="Boolean(endError)"
            fluid
            @show="endPicker.handleShow"
          >
            <template #buttonbar>
              <DatePickerButtonBar
                @cancel="endPicker.handleCancel"
                @confirm="endPicker.handleConfirm"
              />
            </template>
          </DatePicker>
          <small
            v-if="endError"
            id="managed-entry-end-error"
            class="text-destructive text-xs"
          >{{ endError }}</small>
        </div>
      </div>
      <label
        for="managed-entry-description"
        class="flex flex-col gap-1.5 text-sm font-medium"
      >
        Description
        <Textarea
          id="managed-entry-description"
          v-model="description"
          maxlength="2000"
          rows="2"
          :disabled="fieldsDisabled"
          fluid
        />
      </label>
      <label
        for="managed-entry-billable"
        class="flex items-center gap-2 text-sm"
      >
        <Checkbox
          v-model="isBillable"
          input-id="managed-entry-billable"
          :disabled="fieldsDisabled"
          binary
        />
        Billable
      </label>
      <Message
        v-if="error"
        severity="error"
        :pt="{ transition: { onAfterEnter: revealError } }"
      >
        {{ error }}
      </Message>
      <RequestErrorCard
        v-if="projectAccessError"
        title="Unable to verify project access"
        :message="projectAccessError"
        @retry="emit('retryAccess')"
      />
    </form>
    <template #footer>
      <Button
        :label="entry ? 'Save changes' : 'Create time entry'"
        type="submit"
        form="managed-entry-form"
        class="w-full sm:w-auto"
        :disabled="fieldsDisabled || choicesPending"
        :loading="busy"
      />
    </template>
  </AppDialog>
</template>

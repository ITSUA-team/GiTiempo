<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, onBeforeUnmount } from 'vue';
import { type TimeEntryResponse } from '@gitiempo/shared';
import { giTiempoAutoCompleteDropdownPt, giTiempoDatePickerPt } from '@gitiempo/web-config/theme';
import { AppDialog, DatePickerButtonBar, filterAutocompleteOptions, getErrorMessage, useDatePickerConfirmCancel } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';

import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { managedMemberOptions } from '@/components/time-entries/managed-member-options';
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
  members: ManagementMember[];
  entry?: TimeEntryResponse;
  busy: boolean;
  accessUnverified: boolean;
  projectAccessError: string;
  locked: boolean;
  error: string;
  taskRefresh: number;
}>();

const emit = defineEmits<{
  close: [];
  create: [input: ManagedEntryCreate];
  update: [input: ManagedEntryUpdate];
  scopeLost: [];
  accessCheck: [];
  retryAccess: [];
}>();

const visible = defineModel<boolean>('visible', { required: true });
const entry = props.entry;
type MemberOption = ManagementMember & { label: string };
type TaskOption = Pick<ManagementTask, 'id' | 'title'>;
const memberModel = shallowRef<MemberOption | string | null>(null);
const taskModel = shallowRef<TaskOption | string | null>(entry?.task ?? null);
const userId = computed(() => entry?.userId ?? (typeof memberModel.value === 'object' ? memberModel.value?.id : undefined));
const taskId = computed(() => typeof taskModel.value === 'object' ? taskModel.value?.id : undefined);
const memberSearch = shallowRef({ query: '' });
const taskSearch = shallowRef({ query: '' });
const start = ref<Date | null>(entry ? new Date(entry.startedAt) : null);
const end = ref<Date | null>(entry?.endedAt ? new Date(entry.endedAt) : null);
const startPicker = useDatePickerConfirmCancel<Date>();
const endPicker = useDatePickerConfirmCancel<Date>();
const dialogAutoCompletePt = {
  ...giTiempoAutoCompleteDropdownPt,
  overlay: {
    ...giTiempoAutoCompleteDropdownPt.overlay,
    class: [giTiempoAutoCompleteDropdownPt.overlay?.class, 'max-w-[calc(100vw-2rem)]'].join(' '),
  },
};
const description = ref(entry?.description ?? '');
const isBillable = ref(entry?.isBillable ?? false);
const tasks = shallowRef<ManagementTask[]>([]);
const tasksLoading = ref(false);
const tasksError = ref('');
const validationAttempted = ref(false);
let taskRequest = 0;

const displayedTasks = computed(() => {
  if (!entry || tasks.value.some(task => task.id === entry.taskId)) return tasks.value;
  return [entry.task, ...tasks.value];
});
const memberOptions = computed(() => managedMemberOptions(props.members));
const memberSuggestions = computed(() => filterAutocompleteOptions(memberOptions.value, memberSearch.value.query, member => member.label));
const taskSuggestions = computed(() => filterAutocompleteOptions(displayedTasks.value, taskSearch.value.query, task => task.title));
const fieldsDisabled = computed(() => props.busy || props.locked || props.accessUnverified);
const validTask = computed(() => displayedTasks.value.some(task => task.id === taskId.value));
const memberError = computed(() => validationAttempted.value && !userId.value ? 'Select a member.' : '');
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
  const selectedUser = userId.value;
  const current = () => request === taskRequest && selectedUser === userId.value;
  tasks.value = [];
  tasksError.value = '';
  tasksLoading.value = Boolean(selectedUser && props.project.isActive);
  if (!selectedUser || !props.project.isActive) {
    taskModel.value = entry?.task ?? null;
    return;
  }
  try {
    const result = await props.client.tasks(props.project.id, selectedUser, current);
    if (!current()) return;
    tasks.value = result;
    if (taskId.value !== entry?.taskId && !result.some(task => task.id === taskId.value)) {
      taskModel.value = null;
    }
  } catch (error) {
    if (!current()) return;
    if (isApiErrorStatus(error, [401, 403])) emit('scopeLost');
    else if (!(entry && isApiErrorStatus(error, [422]))) {
      tasksError.value = getErrorMessage(error, 'Unable to load eligible tasks.');
      if (isApiErrorStatus(error, [404])) emit('accessCheck');
    }
  } finally {
    if (current()) tasksLoading.value = false;
  }
}

watch(userId, () => {
  taskModel.value = null;
  taskSearch.value = { query: '' };
  isBillable.value = false;
  void loadTasks();
});
watch(() => props.members, (members) => {
  if (!entry && userId.value && !members.some(member => member.id === userId.value)) {
    memberModel.value = null;
  }
});
watch([() => props.taskRefresh, () => props.project.isActive], () => { void loadTasks(); });
onBeforeUnmount(() => { taskRequest += 1; });
void loadTasks();

function selectTask(value: TaskOption | string | null) {
  taskModel.value = value;
  if (!entry && typeof value === 'object') {
    isBillable.value = tasks.value.find(task => task.id === value?.id)?.defaultBillableForTimeEntries ?? false;
  }
}

async function submit(event: SubmitEvent) {
  if (fieldsDisabled.value || (tasksLoading.value && taskId.value !== entry?.taskId)) return;
  validationAttempted.value = true;
  if (!userId.value || !taskId.value || !validTask.value || !start.value || !end.value || endError.value) {
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
    emit('create', { userId: userId.value, taskId: taskId.value, startedAt, endedAt, description: notes, isBillable: isBillable.value });
    return;
  }

  const input: ManagedEntryUpdate = {};
  if (taskId.value !== entry.taskId) input.taskId = taskId.value;
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
        <label
          for="managed-entry-project"
          class="flex min-w-0 flex-col gap-1.5 text-sm font-medium"
        >
          Project
          <InputText
            id="managed-entry-project"
            :model-value="project.name"
            readonly
            fluid
          />
        </label>
        <div class="flex min-w-0 flex-col gap-1.5">
          <label
            for="managed-entry-member"
            class="text-sm font-medium"
          >
            Member
          </label>
          <InputText
            v-if="entry"
            id="managed-entry-member"
            :model-value="entry.user.displayName || entry.user.email"
            readonly
            fluid
          />
          <AutoComplete
            v-else
            v-model="memberModel"
            input-id="managed-entry-member"
            class="w-full"
            :pt="requiredFieldPt(dialogAutoCompletePt, memberError ? 'managed-entry-member-error' : undefined)"
            :suggestions="memberSuggestions"
            complete-on-focus
            data-key="id"
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            placeholder="Select a member"
            empty-search-message="No matching eligible members"
            :disabled="fieldsDisabled"
            :invalid="Boolean(memberError)"
            fluid
            @complete="memberSearch = $event"
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
          :pt="requiredFieldPt(dialogAutoCompletePt, taskError ? 'managed-entry-task-error' : undefined)"
          :model-value="taskModel"
          :suggestions="taskSuggestions"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          force-selection
          :min-length="0"
          option-label="title"
          placeholder="Select a task"
          empty-search-message="No matching eligible tasks"
          :loading="tasksLoading"
          :disabled="!userId || tasksLoading || fieldsDisabled || !project.isActive"
          :invalid="Boolean(taskError)"
          fluid
          @complete="taskSearch = $event"
          @update:model-value="selectTask"
        />
        <small
          v-if="taskError"
          id="managed-entry-task-error"
          class="text-destructive text-xs"
        >{{ taskError }}</small>
      </div>
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
        :disabled="fieldsDisabled || (tasksLoading && taskId !== entry?.taskId)"
        :loading="busy"
      />
    </template>
  </AppDialog>
</template>

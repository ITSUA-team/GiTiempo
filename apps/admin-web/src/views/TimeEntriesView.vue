<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { ClockIcon, FolderIcon, PlusIcon } from '@heroicons/vue/24/outline';
import { managedTimeEntryConcurrentUpdateCode, managedTimeEntryConflictSchema, managedTimeEntryNotFoundCode, WorkspaceRoles, type TimeEntryResponse } from '@gitiempo/shared';
import { giTiempoDatePickerPt, giTiempoSelectPt } from '@gitiempo/web-config/theme';
import { DatePickerButtonBar, EmptyStateBlock, EntryActionButton, FilterAutoComplete, filterAutocompleteOptions, getErrorMessage, MobileRecordCard, SurfaceCard, useDatePickerConfirmCancel, useIsMobileViewport } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import { formatLocalTime, formatPaddedHoursMinutesDuration, getLocalDateKey } from '@gitiempo/web-shared/time';
import { useIntervalFn } from '@vueuse/core';
import { useQueryClient } from '@tanstack/vue-query';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

import RequestErrorCard from '@/components/RequestErrorCard.vue';
import ManagedEntryActions from '@/components/time-entries/ManagedEntryActions.vue';
import ManagedEntryDialog from '@/components/time-entries/ManagedEntryDialog.vue';
import ManagedEntryStatus from '@/components/time-entries/ManagedEntryStatus.vue';
import { managedMemberOptions } from '@/components/time-entries/managed-member-options';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { invalidateQueryKeys } from '@/composables/query';
import { useManagedTimeEntries } from '@/composables/time-entries/useManagedTimeEntries';
import { entryListColumnPt } from '@/constants/entry-list-table';
import { adminMutationInvalidationKeys } from '@/lib/query-keys';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import {
  createAdminTimeEntriesClient,
  type ManagedEntryCreate,
  type ManagedEntryUpdate,
  type ManagementMember,
} from '@/services/admin-time-entries-client';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const queryClient = useQueryClient();
const serverScope = computed(() => getAdminServerStateScope(auth.accessToken));
const scope = computed(() => {
  const { role, workspaceId, userId } = serverScope.value;
  if (role !== WorkspaceRoles.Admin && role !== WorkspaceRoles.PM) return '';
  return workspaceId && userId ? JSON.stringify([workspaceId, userId, role]) : '';
});
const client = createAdminTimeEntriesClient();
const {
  projects, project, projectId, members, memberId, search, dates, page, list,
  loadingProjects, loadingEntries, projectError, projectAccessError, checkingProjectAccess, entriesError, memberError,
  hasEligibleMembers, eligibleMembersError, loadEligibleMembers, loadMembers,
  retryProjects, reloadScope, recheckProjectAccess, refresh, refreshEntries, applyUpdatedEntry,
} = useManagedTimeEntries(scope, client);
const mobile = useIsMobileViewport();
const { requireConfirmation, dismissConfirmation } = useConfirmation();
const editor = shallowRef<{ entry?: TimeEntryResponse; opener?: HTMLElement }>();
const editorVisible = ref(false);
const editorLocked = ref(false);
const pendingMutation = shallowRef<{ inEditor: boolean; entryId?: string }>();
const pendingDeletionId = computed(() => pendingMutation.value?.inEditor ? undefined : pendingMutation.value?.entryId);
const accessUnverified = computed(() => checkingProjectAccess.value || Boolean(projectAccessError.value));
const actionsDisabled = computed(() => Boolean(pendingDeletionId.value) || accessUnverified.value);
const mutationError = ref('');
const editorError = ref('');
const choicesRefresh = ref(0);
const dateDraft = ref<(Date | null)[] | null>(null);
const datePicker = useDatePickerConfirmCancel<(Date | null)[]>();
watch([dates, scope], () => { dateDraft.value = dates.value; }, { flush: 'sync' });
const hasFilters = computed(() => Boolean(search.value.trim() || memberId.value || dates.value?.[0]));
const selectedMemberFallback = shallowRef<ManagementMember>();
const memberOptions = computed(() => {
  const selected = selectedMemberFallback.value;
  const options = members.value;
  if (selected && selected.id === memberId.value && !options.some(member => member.id === selected.id)) {
    return managedMemberOptions([...options, selected]);
  }
  return managedMemberOptions(options);
});
const memberSearch = shallowRef({ query: '' });
const selectedMember = computed(() => memberOptions.value.find(member => member.id === memberId.value) ?? null);
const memberSuggestions = computed(() => filterAutocompleteOptions(memberOptions.value, memberSearch.value.query, member => member.label));
const rangeFilterPt = {
  ...giTiempoDatePickerPt,
  pcInputText: { root: { ...giTiempoDatePickerPt.pcInputText.root, 'aria-label': 'Filter by date range' } },
};

function selectMember(value: (typeof memberOptions.value)[number] | string | null) {
  if (typeof value === 'string' && value.trim()) return;
  selectedMemberFallback.value = typeof value === 'object' ? value ?? undefined : undefined;
  memberId.value = selectedMemberFallback.value?.id;
}
const now = ref(Date.now());
const timer = useIntervalFn(() => { now.value = Date.now(); }, 1000, { immediate: false });
watch(() => list.value?.items.some(entry => !entry.endedAt), running => {
  if (running) {
    now.value = Date.now();
    timer.resume();
  } else timer.pause();
});

const shortDate = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
const rowCount = computed(() => list.value?.meta.total ?? 0);
const columnPt = {
  ...entryListColumnPt,
  bodyCell: { class: [entryListColumnPt.bodyCell, 'p-2'] },
};
const endAlignedColumnPt = { ...columnPt, columnHeaderContent: 'justify-end' };

function spansMultipleDays(entry: TimeEntryResponse): entry is TimeEntryResponse & { endedAt: string } {
  return entry.endedAt !== null && getLocalDateKey(entry.startedAt) !== getLocalDateKey(entry.endedAt);
}

function dateAndTime(value: string) {
  return `${shortDate.format(new Date(value))}, ${formatLocalTime(value)}`;
}

function timeInterval(entry: TimeEntryResponse) {
  const end = entry.endedAt ? formatLocalTime(entry.endedAt) : 'ongoing';
  return `${formatLocalTime(entry.startedAt)} – ${end}`;
}

function duration(entry: TimeEntryResponse) {
  const seconds = entry.durationSeconds ?? Math.max(0, (now.value - Date.parse(entry.startedAt)) / 1000);
  return formatPaddedHoursMinutesDuration(seconds);
}

function clearFilters() {
  search.value = '';
  selectMember(null);
  dates.value = null;
  dateDraft.value = null;
}

function updateDateDraft(value: Date | (Date | null)[] | null | undefined) {
  dateDraft.value = Array.isArray(value) ? value : null;
  if (value == null) dates.value = null;
}

function confirmDateRange() {
  const [start, end] = dateDraft.value ?? [];
  if (start && end) dates.value = [start, end];
  dateDraft.value = dates.value;
  datePicker.handleConfirm();
}

function closeEditor() {
  editorVisible.value = false;
  editor.value = undefined;
  editorError.value = '';
  editorLocked.value = false;
}

async function finishClosingEditor() {
  const opener = editor.value?.opener;
  const activeGeneration = generation;
  closeEditor();
  await nextTick();
  if (activeGeneration !== generation || editor.value) return;
  if (opener?.isConnected && !opener.matches(':disabled')) opener.focus();
  else document.getElementById('managed-time-entries-search')?.focus();
}

async function verifyProjectAccess({ reloadChoices = false, refreshList = true } = {}) {
  const activeGeneration = generation;
  const verified = await recheckProjectAccess();
  if (!verified || activeGeneration !== generation) return;
  if (refreshList) refreshEntries();
  if (reloadChoices && editor.value) choicesRefresh.value += 1;
}

let generation = 0;
watch([scope, projectId], () => {
  generation += 1;
  pendingMutation.value = undefined;
  memberSearch.value = { query: '' };
  selectedMemberFallback.value = undefined;
  mutationError.value = '';
  closeEditor();
  dismissConfirmation();
}, { flush: 'sync' });
onBeforeUnmount(() => {
  generation += 1;
  dismissConfirmation();
});

async function mutate<T>(
  action: () => Promise<T>,
  mutation: NonNullable<typeof pendingMutation.value>,
  onSuccess: (result: T) => void = refresh,
) {
  if (pendingMutation.value || accessUnverified.value) return;
  const activeGeneration = generation;
  const requestScope = serverScope.value;
  const { inEditor } = mutation;
  pendingMutation.value = mutation;
  mutationError.value = '';
  editorError.value = '';
  try {
    const result = await action();
    void invalidateQueryKeys(queryClient, adminMutationInvalidationKeys.afterReportsDataMutation(requestScope));
    if (activeGeneration !== generation) return;
    if (inEditor) editorVisible.value = false;
    onSuccess(result);
  } catch (error) {
    if (activeGeneration !== generation) return;
    if (isApiErrorStatus(error, [401, 403])) {
      void reloadScope();
      return;
    }
    const target = inEditor ? editorError : mutationError;
    target.value = getErrorMessage(error, 'Unable to save time entry changes.');
    if (isApiErrorStatus(error, [404])) {
      if (inEditor && error.code === managedTimeEntryNotFoundCode) editorLocked.value = true;
      await verifyProjectAccess({ reloadChoices: inEditor && !editorLocked.value });
    } else if (isApiErrorStatus(error, [409])) {
      const conflict = managedTimeEntryConflictSchema.safeParse(error.body);
      if (conflict.success) target.value = conflict.data.message;
      if (inEditor && error.code !== managedTimeEntryConcurrentUpdateCode) editorLocked.value = true;
      if (inEditor && editor.value?.entry) refreshEntries();
      else refresh();
    } else if (isApiErrorStatus(error, [422])) {
      await verifyProjectAccess({ reloadChoices: inEditor, refreshList: false });
      if (activeGeneration === generation) void loadEligibleMembers();
    }
  } finally {
    if (activeGeneration === generation) pendingMutation.value = undefined;
  }
}

function createEntry(destinationId: string, input: ManagedEntryCreate) {
  void mutate(
    () => client.create(destinationId, input),
    { inEditor: true },
    () => {
      if (destinationId === projectId.value) refresh();
    },
  );
}

function updateEntry(input: ManagedEntryUpdate) {
  const entry = editor.value?.entry;
  if (entry && entry.projectId === projectId.value) {
    void mutate(
      () => client.update(entry.projectId, entry.id, input),
      { inEditor: true, entryId: entry.id },
      updated => {
        const rowRetained = applyUpdatedEntry(entry, updated);
        if (!rowRetained && editor.value) editor.value = { entry };
      },
    );
  }
}

function openEditor(event: MouseEvent, entry?: TimeEntryResponse) {
  if (editor.value || pendingMutation.value || accessUnverified.value) return;
  const opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
  editor.value = { entry, opener };
  editorVisible.value = true;
}

function confirmDelete(entry: TimeEntryResponse) {
  if (pendingMutation.value || accessUnverified.value) return;
  const activeGeneration = generation;
  requireConfirmation(
    `Delete the time entry for “${entry.task.title}”? This action cannot be undone.`,
    'Delete time entry',
    'Delete time entry',
    () => {
      if (activeGeneration === generation && entry.projectId === projectId.value) {
        void mutate(() => client.remove(entry.projectId, entry.id), { inEditor: false, entryId: entry.id });
      }
    },
  );
}
</script>

<template>
  <div class="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(20rem,2fr)] sm:gap-5 md:grid-cols-[312px_minmax(0,1fr)]">
    <SurfaceCard
      body-class="flex flex-col gap-2"
      padding-class="p-0 sm:p-3"
      class="managed-projects-panel"
    >
      <h2
        id="managed-projects-heading"
        class="text-text-dark text-base font-semibold"
      >
        {{ mobile ? 'Project' : 'Projects' }}
      </h2>
      <div
        v-if="loadingProjects"
        role="status"
      >
        <span class="sr-only">Loading projects…</span>
        <Skeleton height="2rem" />
      </div>
      <RequestErrorCard
        v-else-if="projectError"
        title="Failed to load projects"
        :message="projectError"
        @retry="retryProjects"
      />
      <Select
        v-else-if="mobile && projects.length"
        v-model="projectId"
        aria-labelledby="managed-projects-heading"
        :options="projects"
        option-label="name"
        option-value="id"
        :pt="giTiempoSelectPt"
        fluid
      />
      <div
        v-else-if="projects.length"
        class="flex flex-col gap-1"
        role="group"
        aria-labelledby="managed-projects-heading"
      >
        <Button
          v-for="option in projects"
          :key="option.id"
          text
          :severity="option.id === projectId ? undefined : 'secondary'"
          :class="['min-h-[42px] justify-start px-2.5 text-left', { 'bg-accent-tint': option.id === projectId }]"
          :aria-pressed="option.id === projectId"
          @click="projectId = option.id"
        >
          <FolderIcon
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span class="min-w-0 text-base wrap-break-word">{{ option.name }}</span>
        </Button>
      </div>
      <p
        v-else
        class="text-text-muted text-sm"
      >
        No manageable projects.
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-if="project"
      padding-class="p-0 sm:p-4"
      body-class="flex min-w-0 flex-col gap-4"
      class="managed-time-entries-list min-w-0"
      :aria-busy="checkingProjectAccess || undefined"
    >
      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div :class="mobile && project.isActive ? 'sr-only' : 'min-w-0'">
            <h2 class="text-text-dark text-lg font-semibold wrap-break-word">
              {{ project.name }}
            </h2>
            <p
              v-if="!project.isActive"
              class="text-text-muted text-sm"
            >
              Archived project
            </p>
          </div>
          <div class="flex items-center gap-2 sm:gap-3">
            <IconField class="min-w-0 grow lg:w-[220px] lg:grow-0">
              <InputIcon class="pi pi-search text-text-muted" />
              <InputText
                id="managed-time-entries-search"
                v-model="search"
                aria-label="Search entries"
                placeholder="Search entries"
                maxlength="200"
                class="h-[38px] w-full text-[13px]"
              />
            </IconField>
            <EntryActionButton
              v-if="project.isActive && hasEligibleMembers"
              :icon="PlusIcon"
              label="New time entry"
              :disabled="actionsDisabled"
              class="shrink-0"
              @click="openEditor"
            />
          </div>
        </div>

        <div class="grid items-center gap-2 sm:flex sm:flex-wrap">
          <FilterAutoComplete
            :model-value="selectedMember"
            aria-label="Filter by member"
            :suggestions="memberSuggestions"
            force-selection
            option-label="label"
            placeholder="All members"
            show-clear
            class="w-full min-w-0 sm:w-56"
            @complete="memberSearch = $event"
            @update:model-value="selectMember"
          />
          <DatePicker
            :ref="datePicker.datePickerRef"
            :model-value="dateDraft"
            :pt="rangeFilterPt"
            selection-mode="range"
            date-format="M d, yy"
            placeholder="Date range"
            :manual-input="false"
            show-button-bar
            show-clear
            show-icon
            icon-display="input"
            size="small"
            class="min-h-[38px] w-full min-w-0 sm:w-72"
            @show="datePicker.handleShow"
            @hide="dateDraft = dates"
            @update:model-value="updateDateDraft"
          >
            <template #buttonbar>
              <DatePickerButtonBar
                @cancel="datePicker.handleCancel"
                @confirm="confirmDateRange"
              />
            </template>
          </DatePicker>
          <Button
            v-if="hasFilters"
            label="Clear filters"
            class="justify-self-start"
            text
            severity="secondary"
            size="small"
            @click="clearFilters"
          />
        </div>
      </div>

      <RequestErrorCard
        v-if="projectAccessError && !editor"
        title="Unable to verify project access"
        :message="projectAccessError"
        @retry="verifyProjectAccess()"
      />
      <Message
        v-if="mutationError"
        severity="error"
      >
        {{ mutationError }}
      </Message>
      <RequestErrorCard
        v-if="memberError"
        title="Failed to load member filters"
        :message="memberError"
        @retry="loadMembers"
      />
      <RequestErrorCard
        v-if="eligibleMembersError"
        title="Failed to load eligible members"
        :message="eligibleMembersError"
        @retry="loadEligibleMembers"
      />
      <RequestErrorCard
        v-if="entriesError"
        title="Failed to load time entries"
        :message="entriesError"
        @retry="refresh"
      />
      <div
        v-if="loadingEntries"
        role="status"
        class="grid gap-2"
      >
        <span class="sr-only">Loading time entries…</span>
        <Skeleton
          v-for="row in 3"
          :key="row"
          :height="mobile ? '8rem' : '3.5rem'"
        />
      </div>
      <div
        v-else-if="!list?.items.length && !entriesError"
        class="text-text-muted flex flex-col items-center gap-2 px-4 py-10 text-center"
      >
        <ClockIcon
          class="size-6"
          aria-hidden="true"
        />
        <EmptyStateBlock
          :title="hasFilters ? 'No matching time entries' : 'No time entries yet'"
          :description="hasFilters ? 'Try a different task, member or date range.' : 'This project has no recorded time.'"
          padding-class="p-0"
        />
      </div>
      <template v-else-if="list?.items.length">
        <div
          v-if="mobile"
          class="grid min-w-0 gap-3"
        >
          <MobileRecordCard
            v-for="entry in list.items"
            :key="entry.id"
          >
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-text-dark min-w-0 text-sm font-semibold wrap-break-word">
                {{ entry.task.title }}
              </h3>
              <ManagedEntryStatus
                :entry="entry"
                part="status"
                class="shrink-0"
              />
            </div>
            <p
              v-if="entry.description"
              class="text-text-muted text-sm wrap-break-word"
            >
              {{ entry.description }}
            </p>
            <dl class="text-text-dark grid gap-1 text-sm">
              <dt class="sr-only">
                Member
              </dt>
              <dd class="wrap-break-word">
                {{ entry.user.displayName || entry.user.email }}
              </dd>
              <dt class="sr-only">
                Date &amp; time
              </dt>
              <dd v-if="spansMultipleDays(entry)">
                <span class="inline-block">{{ dateAndTime(entry.startedAt) }}</span> <span class="inline-block">– {{ dateAndTime(entry.endedAt) }}</span>
              </dd>
              <dd v-else>
                {{ shortDate.format(new Date(entry.startedAt)) }} · {{ timeInterval(entry) }}
              </dd>
              <dt class="sr-only">
                Duration
              </dt>
              <dd>{{ duration(entry) }} · {{ entry.isBillable ? 'Billable' : 'Non-billable' }}</dd>
            </dl>
            <template #actions>
              <ManagedEntryStatus
                v-if="!entry.endedAt || entry.invoiceId"
                :entry="entry"
                part="reason"
                class="mr-auto self-center"
              />
              <ManagedEntryActions
                :entry="entry"
                :disabled="actionsDisabled || pendingMutation?.entryId === entry.id"
                :deleting="pendingDeletionId === entry.id"
                @edit="openEditor($event, entry)"
                @remove="confirmDelete(entry)"
              />
            </template>
          </MobileRecordCard>
        </div>
        <DataTable
          v-else
          :value="list.items"
          data-key="id"
          class="border-divider overflow-hidden rounded-sm border"
          :pt="{
            tableContainer: 'overflow-x-auto',
            table: { class: 'w-full min-w-[43rem] table-fixed border-collapse', 'aria-label': 'Project time entries' },
          }"
        >
          <Column
            header="Task"
            :pt="columnPt"
          >
            <template #body="{ data: entry }">
              <div class="flex flex-col gap-1">
                <span class="text-text-dark text-sm font-semibold wrap-break-word">{{ entry.task.title }}</span>
                <span
                  v-if="entry.description"
                  class="text-text-muted text-xs wrap-break-word"
                >{{ entry.description }}</span>
              </div>
            </template>
          </Column>
          <Column
            header="Member"
            style="width: 112px"
            :pt="columnPt"
          >
            <template #body="{ data: entry }">
              <span class="text-text-muted wrap-break-word">{{ entry.user.displayName || entry.user.email }}</span>
            </template>
          </Column>
          <Column
            header="Date and time"
            style="width: 160px"
            :pt="columnPt"
          >
            <template #body="{ data: entry }">
              <div
                v-if="spansMultipleDays(entry)"
                class="text-[13px] leading-5 [&>span]:whitespace-nowrap"
              >
                <span class="inline-block">{{ dateAndTime(entry.startedAt) }}</span> <span class="inline-block">– {{ dateAndTime(entry.endedAt) }}</span>
              </div>
              <div
                v-else
                class="flex min-w-24 flex-col gap-1"
              >
                <span>{{ shortDate.format(new Date(entry.startedAt)) }}</span>
                <span class="text-text-muted text-xs">{{ timeInterval(entry) }}</span>
              </div>
            </template>
          </Column>
          <Column
            header="Duration"
            style="width: 108px"
            :pt="endAlignedColumnPt"
          >
            <template #body="{ data: entry }">
              <div class="flex flex-col gap-1 text-right whitespace-nowrap">
                <span class="font-semibold">{{ duration(entry) }}</span>
                <span class="text-text-muted text-xs">{{ entry.isBillable ? 'Billable' : 'Non-billable' }}</span>
              </div>
            </template>
          </Column>
          <Column
            header="Status"
            style="width: 150px"
            :pt="columnPt"
          >
            <template #body="{ data: entry }">
              <ManagedEntryStatus :entry="entry" />
            </template>
          </Column>
          <Column
            header="Actions"
            style="width: 88px"
            :pt="endAlignedColumnPt"
          >
            <template #body="{ data: entry }">
              <div class="flex items-center justify-end gap-1">
                <ManagedEntryActions
                  :entry="entry"
                  :disabled="actionsDisabled || pendingMutation?.entryId === entry.id"
                  :deleting="pendingDeletionId === entry.id"
                  @edit="openEditor($event, entry)"
                  @remove="confirmDelete(entry)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
        <Paginator
          :first="(page - 1) * list.meta.limit"
          :rows="list.meta.limit"
          :total-records="rowCount"
          :page-link-size="mobile ? 3 : 5"
          :always-show="!mobile"
          :template="mobile
            ? 'PrevPageLink PageLinks NextPageLink'
            : 'CurrentPageReport PrevPageLink PageLinks NextPageLink'"
          current-page-report-template="Showing {first}–{last} of {totalRecords}"
          :pt="{ root: 'justify-center gap-1 p-0 sm:justify-end', current: 'mr-auto px-0' }"
          @page="page = $event.page + 1"
        />
      </template>
    </SurfaceCard>

    <ManagedEntryDialog
      v-if="project && editor"
      v-model:visible="editorVisible"
      :client="client"
      :project="project"
      :projects="projects"
      :entry="editor.entry"
      :busy="pendingMutation?.inEditor ?? false"
      :access-unverified="accessUnverified"
      :project-access-error="projectAccessError"
      :locked="editorLocked"
      :error="editorError"
      :choices-refresh="choicesRefresh"
      @close="finishClosingEditor"
      @create="createEntry"
      @update="updateEntry"
      @scope-lost="reloadScope"
      @access-check="verifyProjectAccess()"
      @retry-access="verifyProjectAccess({ reloadChoices: true })"
    />
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .managed-time-entries-list,
  .managed-projects-panel {
    background: transparent;
    box-shadow: none;
  }
}
</style>

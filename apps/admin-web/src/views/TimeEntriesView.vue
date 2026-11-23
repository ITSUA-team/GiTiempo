<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { ClockIcon, FolderIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/24/outline';
import { managedTimeEntryConflictSchema, WorkspaceRoles, type TimeEntryResponse } from '@gitiempo/shared';
import { EntryActionButton, getErrorMessage, MobileRecordCard, SurfaceCard, useIsMobileViewport } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import { formatLocalTime, formatPaddedHoursMinutesDuration, getLocalDateKey } from '@gitiempo/web-shared/time';
import { useIntervalFn } from '@vueuse/core';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

import RequestErrorCard from '@/components/RequestErrorCard.vue';
import ManagedEntryActions from '@/components/time-entries/ManagedEntryActions.vue';
import ManagedEntryDialog from '@/components/time-entries/ManagedEntryDialog.vue';
import ManagedEntryStatus from '@/components/time-entries/ManagedEntryStatus.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useManagedTimeEntries } from '@/composables/time-entries/useManagedTimeEntries';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import {
  createAdminTimeEntriesClient,
  type ManagedEntryCreate,
  type ManagedEntryUpdate,
} from '@/services/admin-time-entries-client';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const scope = computed(() => {
  const { role, workspaceId, userId } = getAdminServerStateScope(auth.accessToken);
  if (role !== WorkspaceRoles.Admin && role !== WorkspaceRoles.PM) return '';
  return workspaceId && userId ? JSON.stringify([workspaceId, userId, role]) : '';
});
const client = createAdminTimeEntriesClient();
const {
  projects, project, projectId, members, memberId, search, dates, page, list,
  loadingProjects, loadingEntries, projectError, entriesError, memberError,
  eligibleMembers, eligibleMembersError, loadEligibleMembers, loadMembers,
  retryProjects, reloadScope, refresh,
} = useManagedTimeEntries(scope, client);
const mobile = useIsMobileViewport();
const { requireConfirmation, dismissConfirmation } = useConfirmation();
const editor = shallowRef<{ entry?: TimeEntryResponse }>();
const editorLocked = ref(false);
const busy = ref(false);
const mutationError = ref('');
const editorError = ref('');
const hasFilters = computed(() => Boolean(search.value.trim() || memberId.value || dates.value?.[0]));
const memberOptions = computed(() => members.value.map(member => ({
  id: member.id,
  label: member.displayName || member.email,
})));
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
  headerCell: { class: 'h-[42px] bg-app-bg px-2 py-0 text-left text-[13px] font-semibold' },
  bodyCell: { class: 'h-[66px] border-b border-divider p-2 text-[13px]' },
};
const endAlignedColumnPt = { ...columnPt, columnHeaderContent: 'justify-end' };

function timeInterval(entry: TimeEntryResponse) {
  if (!entry.endedAt) return `${formatLocalTime(entry.startedAt)} – ongoing`;
  const end = getLocalDateKey(entry.startedAt) === getLocalDateKey(entry.endedAt)
    ? formatLocalTime(entry.endedAt)
    : `${shortDate.format(new Date(entry.endedAt))} ${formatLocalTime(entry.endedAt)}`;
  return `${formatLocalTime(entry.startedAt)} – ${end}`;
}

function duration(entry: TimeEntryResponse) {
  const seconds = entry.durationSeconds ?? Math.max(0, (now.value - Date.parse(entry.startedAt)) / 1000);
  return formatPaddedHoursMinutesDuration(seconds);
}

function clearFilters() {
  search.value = '';
  memberId.value = undefined;
  dates.value = null;
}

function closeEditor() {
  editor.value = undefined;
  editorError.value = '';
  editorLocked.value = false;
}

let generation = 0;
watch([scope, projectId], () => {
  generation += 1;
  busy.value = false;
  mutationError.value = '';
  closeEditor();
  dismissConfirmation();
}, { flush: 'sync' });
onBeforeUnmount(() => {
  generation += 1;
  dismissConfirmation();
});

async function mutate(action: () => Promise<unknown>, inEditor: boolean) {
  if (busy.value) return;
  const activeGeneration = generation;
  busy.value = true;
  mutationError.value = '';
  editorError.value = '';
  try {
    await action();
    if (activeGeneration !== generation) return;
    closeEditor();
    refresh();
  } catch (error) {
    if (activeGeneration !== generation) return;
    if (isApiErrorStatus(error, [401, 403, 404])) {
      void reloadScope();
      return;
    }
    const target = inEditor ? editorError : mutationError;
    target.value = getErrorMessage(error, 'Unable to save time entry changes.');
    if (isApiErrorStatus(error, [409])) {
      const conflict = managedTimeEntryConflictSchema.safeParse(error.body);
      if (conflict.success) target.value = conflict.data.message;
      if (inEditor) editorLocked.value = true;
      refresh();
    } else if (isApiErrorStatus(error, [422])) {
      void loadEligibleMembers();
    }
  } finally {
    if (activeGeneration === generation) busy.value = false;
  }
}

function createEntry(input: ManagedEntryCreate) {
  const selected = projectId.value;
  if (selected) void mutate(() => client.create(selected, input), true);
}

function updateEntry(input: ManagedEntryUpdate) {
  const entry = editor.value?.entry;
  if (entry && entry.projectId === projectId.value) {
    void mutate(() => client.update(entry.projectId, entry.id, input), true);
  }
}

function confirmDelete(entry: TimeEntryResponse) {
  const activeGeneration = generation;
  requireConfirmation(
    `Delete the time entry for “${entry.task.title}”? This action cannot be undone.`,
    'Delete time entry',
    'Delete time entry',
    () => {
      if (activeGeneration === generation && entry.projectId === projectId.value) {
        void mutate(() => client.remove(entry.projectId, entry.id), false);
      }
    },
  );
}
</script>

<template>
  <div class="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[208px_minmax(0,1fr)] sm:gap-5">
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
            <div class="relative min-w-0 grow lg:w-[220px] lg:grow-0">
              <MagnifyingGlassIcon
                class="text-text-muted pointer-events-none absolute top-3 left-3 size-4"
                aria-hidden="true"
              />
              <InputText
                v-model="search"
                aria-label="Search tasks"
                placeholder="Search entries"
                maxlength="200"
                class="h-[38px] w-full pl-9 text-[13px]"
              />
            </div>
            <EntryActionButton
              v-if="project.isActive && eligibleMembers.length"
              :icon="PlusIcon"
              label="New time entry"
              class="shrink-0"
              :disabled="busy"
              @click="editor = {}"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <Select
            v-model="memberId"
            aria-label="Filter by member"
            :options="memberOptions"
            option-label="label"
            option-value="id"
            placeholder="All members"
            show-clear
            size="small"
            class="min-h-[38px] w-full min-w-0 sm:w-56"
          />
          <DatePicker
            v-model="dates"
            :pt="{ pcInputText: { root: { 'aria-label': 'Filter by date range', class: 'min-w-0 w-full' } } }"
            selection-mode="range"
            date-format="M d, yy"
            placeholder="Date range"
            :manual-input="false"
            show-icon
            icon-display="input"
            size="small"
            class="min-h-[38px] w-full min-w-0 sm:w-64"
          />
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
        v-else-if="loadingEntries"
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
        v-else-if="!list?.items.length"
        class="text-text-muted flex flex-col items-center gap-2 px-4 py-10 text-center"
      >
        <ClockIcon
          class="size-6"
          aria-hidden="true"
        />
        <p class="text-text-dark font-medium">
          {{ hasFilters ? 'No matching time entries' : 'No time entries yet' }}
        </p>
        <p class="text-sm">
          {{ hasFilters ? 'Try a different task, member or date range.' : 'This project has no recorded time.' }}
        </p>
      </div>
      <template v-else>
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
              <dd>{{ shortDate.format(new Date(entry.startedAt)) }} · {{ timeInterval(entry) }}</dd>
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
                :disabled="busy"
                @edit="editor = { entry }"
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
            table: { class: 'w-full min-w-[42rem] table-fixed border-collapse', 'aria-label': 'Project time entries' },
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
            style="width: 148px"
            :pt="columnPt"
          >
            <template #body="{ data: entry }">
              <div class="flex min-w-24 flex-col gap-1">
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
                  :disabled="busy"
                  @edit="editor = { entry }"
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
          :pt="{ root: 'justify-end gap-1 p-0', current: 'mr-auto px-0' }"
          @page="page = $event.page + 1"
        />
      </template>
    </SurfaceCard>

    <ManagedEntryDialog
      v-if="project && editor"
      :client="client"
      :project="project"
      :members="eligibleMembers"
      :entry="editor.entry"
      :busy="busy"
      :locked="editorLocked"
      :error="editorError"
      @close="closeEditor"
      @create="createEntry"
      @update="updateEntry"
      @scope-lost="reloadScope"
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

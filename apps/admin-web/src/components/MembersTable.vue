<script setup lang="ts">
import { computed, ref } from 'vue';
import { UserPlusIcon } from '@heroicons/vue/24/outline';
import type {
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  EntryActionButton,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  managementTableColumnPt,
  managementTableFilterAutoCompletePt,
  managementTableFilterSelectPt,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import AutoComplete from 'primevue/autocomplete';
import Avatar from 'primevue/avatar';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import type {
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableFilterOption,
  MembersTableFilterUpdate,
  MembersTableFilters,
  MembersTableRow,
} from '@/lib/members-table';

interface AutoCompleteCompleteEvent {
  query: string;
}

const props = defineProps<{
  emptyDescription: string;
  expandedRows: MembersTableExpandedRows;
  filters: MembersTableFilters;
  isMobileViewport: boolean;
  lastActiveFilterOptions: MembersTableFilterOption<MemberLastActiveFilter>[];
  loading: boolean;
  projectFilterOptions: MembersTableFilterOption[];
  roleFilterOptions: MembersTableFilterOption<WorkspaceRole>[];
  rows: MembersTableRow[];
}>();

const memberQuerySuggestions = ref<string[]>([]);
const projectFilterSuggestions = ref<MembersTableFilterOption[]>([]);

const memberQueryOptions = computed(() => {
  const options = props.rows.flatMap((row) => [
    row.primaryLabel,
    row.secondaryLabel,
  ]).filter((label): label is string => !!label);

  return [...new Set(options)].sort((a, b) => a.localeCompare(b));
});

const selectedProjectFilterOption = computed(
  () =>
    props.projectFilterOptions.find(
      (option) => option.value === props.filters.projectIds[0],
    ) ?? null,
);

function filterSuggestions(options: string[], query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...options];
  }

  return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
}

function filterOptions<Option extends { label: string }>(
  options: Option[],
  query: string,
): Option[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...options];
  }

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
}

function handleMemberQueryComplete(event: AutoCompleteCompleteEvent): void {
  memberQuerySuggestions.value = filterSuggestions(
    memberQueryOptions.value,
    event.query,
  );
}

function handleProjectFilterComplete(event: AutoCompleteCompleteEvent): void {
  projectFilterSuggestions.value = filterOptions(
    props.projectFilterOptions,
    event.query,
  );
}

const emit = defineEmits<{
  'edit-member': [member: WorkspaceMemberResponse];
  'invite-member': [];
  'update:expandedRows': [expandedRows: MembersTableExpandedRows | undefined];
  'update:filters': [filters: MembersTableFilterUpdate];
}>();

function updateFilters(filters: MembersTableFilterUpdate): void {
  emit('update:filters', filters);
}

function updateGlobalFilter(value: string | undefined): void {
  updateFilters({ global: value });
}

function updateMemberQueryFilter(value: string | null | undefined): void {
  updateFilters({ memberQuery: value ?? '' });
}

function updateProjectIdsFilter(value: string[] | undefined): void {
  updateFilters({ projectIds: value });
}

function updateProjectFilter(
  value: MembersTableFilterOption | string | null,
): void {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      updateProjectIdsFilter([]);
    }

    return;
  }

  updateProjectIdsFilter(value?.value ? [value.value] : []);
}

function updateRoleFilter(value: WorkspaceRole | null | undefined): void {
  updateFilters({ role: value });
}

function updateLastActiveFilter(
  value: MemberLastActiveFilter | undefined,
): void {
  updateFilters({ lastActive: value });
}

function updateExpandedRows(value: MembersTableExpandedRows | undefined): void {
  emit('update:expandedRows', value);
}

const columns: ManagementTableColumn[] = [
  { key: 'member', label: 'Member', width: 'fill' },
  { key: 'role', label: 'Role', width: 120 },
  { key: 'projects', label: 'Projects Assigned', width: 220 },
  { key: 'lastActive', label: 'Last Active', width: 140 },
];
</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Members Table">
      <template #actions>
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <IconField class="w-full sm:w-[280px]">
            <InputIcon class="pi pi-search text-text-muted" />
            <InputText
              :model-value="filters.global"
              aria-label="Search members"
              class="h-[38px] w-full rounded-[6px] text-[14px]"
              placeholder="Search members"
              @update:model-value="updateGlobalFilter"
            />
          </IconField>
          <EntryActionButton
            data-testid="members-table-invite"
            :icon="UserPlusIcon"
            label="Invite member"
            @click="emit('invite-member')"
          />
        </div>
      </template>
    </SectionHeader>
  </div>

  <div
    v-if="isMobileViewport"
    class="mb-4 grid gap-3"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-member-name-filter"
        class="text-text-muted text-[12px] font-medium"
      >Member</label>
      <AutoComplete
        input-id="mobile-member-name-filter"
        :model-value="filters.memberQuery"
        :suggestions="memberQuerySuggestions"
        complete-on-focus
        dropdown
        dropdown-mode="blank"
        :min-length="0"
        placeholder="Filter name or email"
        :pt="managementTableFilterAutoCompletePt"
        @complete="handleMemberQueryComplete"
        @update:model-value="updateMemberQueryFilter"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-member-role-filter"
          class="text-text-muted text-[12px] font-medium"
        >Role</label>
        <Select
          id="mobile-member-role-filter"
          :model-value="filters.role"
          :options="roleFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All roles"
          show-clear
          :pt="managementTableFilterSelectPt"
          @update:model-value="updateRoleFilter"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-member-last-active-filter"
          class="text-text-muted text-[12px] font-medium"
        >Last active</label>
        <Select
          id="mobile-member-last-active-filter"
          :model-value="filters.lastActive"
          :options="lastActiveFilterOptions"
          option-label="label"
          option-value="value"
          :pt="managementTableFilterSelectPt"
          @update:model-value="updateLastActiveFilter"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-member-projects-filter"
        class="text-text-muted text-[12px] font-medium"
      >Projects assigned</label>
      <AutoComplete
        input-id="mobile-member-projects-filter"
        :model-value="selectedProjectFilterOption"
        :suggestions="projectFilterSuggestions"
        complete-on-focus
        dropdown
        dropdown-mode="blank"
        force-selection
        :min-length="0"
        option-label="label"
        placeholder="All projects"
        show-clear
        :pt="managementTableFilterAutoCompletePt"
        @complete="handleProjectFilterComplete"
        @update:model-value="updateProjectFilter"
      />
    </div>
  </div>

  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <template v-if="loading">
      <MobileRecordCard
        v-for="index in 3"
        :key="index"
        data-testid="members-mobile-loading-card"
      >
        <div class="flex items-start gap-3">
          <Skeleton
            shape="circle"
            size="2.25rem"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              width="9rem"
              height="1rem"
            />
            <Skeleton
              width="7rem"
              height="0.75rem"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <Skeleton
              width="3rem"
              height="0.75rem"
            />
            <Skeleton
              width="4.5rem"
              height="0.875rem"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Skeleton
              width="4rem"
              height="0.75rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <div class="col-span-2 flex flex-col gap-2">
            <Skeleton
              width="4.5rem"
              height="0.75rem"
            />
            <Skeleton
              width="6rem"
              height="0.875rem"
            />
          </div>
        </div>
      </MobileRecordCard>
    </template>

    <template v-else-if="rows.length > 0">
      <MobileRecordCard
        v-for="row in rows"
        :key="row.id"
        data-testid="member-mobile-card"
      >
        <div class="flex items-start gap-3">
          <Avatar
            :image="row.avatarImage"
            :label="row.avatarLabel"
            shape="circle"
            class="size-9 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="min-w-0 flex-1">
            <h3>
              <button
                v-if="row.canManage"
                type="button"
                class="text-brand focus-visible:outline-brand max-w-full truncate text-left text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                :aria-label="`Edit member ${row.primaryLabel}`"
                :data-testid="`member-mobile-name-${row.id}`"
                @click="emit('edit-member', row.member)"
              >
                {{ row.primaryLabel }}
              </button>
              <span
                v-else
                class="text-brand block truncate text-[15px] font-semibold"
              >
                {{ row.primaryLabel }}
              </span>
            </h3>
            <p
              v-if="row.secondaryLabel"
              class="text-text-muted truncate text-[12px]"
            >
              {{ row.secondaryLabel }}
            </p>
          </div>
        </div>

        <MobileRecordMetadataList
          :items="[
            { label: 'Role', value: row.roleLabel },
            { label: 'Projects', value: row.projectsAssignedLabel },
            {
              label: 'Last active',
              value: row.lastActiveLabel,
              fullWidth: true,
            },
          ]"
        />

        <slot
          name="row-expansion"
          :row="row"
        />
      </MobileRecordCard>
    </template>

    <EmptyStateBlock
      v-else
      title="No members found"
      :description="emptyDescription"
    />
  </div>

  <ManagementTableShell
    v-else
    :expanded-rows="expandedRows"
    :columns="columns"
    :value="rows"
    :loading="loading"
    data-key="id"
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[780px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    table-class="min-w-[780px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
    @update:expanded-rows="updateExpandedRows"
  >
    <template #filters>
      <div class="flex min-w-[780px] flex-1 items-center">
        <div class="min-w-0 flex-1 px-3">
          <AutoComplete
            :model-value="filters.memberQuery"
            :suggestions="memberQuerySuggestions"
            aria-label="Filter members by name or email"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            :min-length="0"
            placeholder="Filter name or email"
            :pt="managementTableFilterAutoCompletePt"
            @complete="handleMemberQueryComplete"
            @update:model-value="updateMemberQueryFilter"
          />
        </div>

        <div class="w-[120px] px-3">
          <Select
            :model-value="filters.role"
            :options="roleFilterOptions"
            aria-label="Filter members by role"
            option-label="label"
            option-value="value"
            placeholder="All roles"
            show-clear
            :pt="managementTableFilterSelectPt"
            @update:model-value="updateRoleFilter"
          />
        </div>

        <div class="w-[220px] px-3">
          <AutoComplete
            :model-value="selectedProjectFilterOption"
            :suggestions="projectFilterSuggestions"
            aria-label="Filter members by assigned projects"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            placeholder="All projects"
            show-clear
            :pt="managementTableFilterAutoCompletePt"
            @complete="handleProjectFilterComplete"
            @update:model-value="updateProjectFilter"
          />
        </div>

        <div class="w-[140px] px-3">
          <Select
            :model-value="filters.lastActive"
            :options="lastActiveFilterOptions"
            aria-label="Filter members by last active"
            option-label="label"
            option-value="value"
            :pt="managementTableFilterSelectPt"
            @update:model-value="updateLastActiveFilter"
          />
        </div>
      </div>
    </template>

    <!-- Member: avatar + name + email -->
    <Column :pt="managementTableColumnPt">
      <template #body="{ data }">
        <div class="flex items-center gap-3">
          <Avatar
            :image="data.avatarImage"
            :label="data.avatarLabel"
            shape="circle"
            class="size-8"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="flex min-w-0 flex-col">
            <button
              v-if="data.canManage"
              type="button"
              class="text-brand focus-visible:outline-brand max-w-full truncate text-left text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              :aria-label="`Edit member ${data.primaryLabel}`"
              :data-testid="`member-name-${data.id}`"
              @click="emit('edit-member', data.member)"
            >
              {{ data.primaryLabel }}
            </button>
            <span
              v-else
              class="text-brand truncate text-[14px] font-semibold"
            >
              {{ data.primaryLabel }}
            </span>
            <span
              v-if="data.secondaryLabel"
              class="text-text-muted text-[12px]"
            >{{ data.secondaryLabel }}</span>
          </div>
        </div>
      </template>
    </Column>

    <!-- Role -->
    <Column
      style="width: 120px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-dark text-[13px] font-bold">{{
          data.roleLabel
        }}</span>
      </template>
    </Column>

    <!-- Projects Assigned -->
    <Column
      style="width: 220px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          data.projectsAssignedLabel
        }}</span>
      </template>
    </Column>

    <!-- Last Active -->
    <Column
      style="width: 140px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          data.lastActiveLabel
        }}</span>
      </template>
    </Column>

    <!-- Expansion: supplied by page owner -->
    <template #expansion="{ data }">
      <slot
        name="row-expansion"
        :row="data"
      />
    </template>

    <template #empty>
      <EmptyStateBlock
        title="No members found"
        :description="emptyDescription"
      />
    </template>
  </ManagementTableShell>
</template>

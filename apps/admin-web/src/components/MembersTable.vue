<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDownIcon, UserPlusIcon } from '@heroicons/vue/24/outline';
import type {
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import { giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';
import {
  EmptyStateBlock,
  EntryActionButton,
  FilterAutoComplete,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  filterAutocompleteStrings,
  managementTableFilterMultiSelectPt,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

import {
  adminTableBodyRowClass,
  adminTableColumnPt,
  adminTableClass,
  adminTableHeaderClass,
  adminTableMinWidthClass,
} from '@/lib/admin-table-classes';
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

const memberQueryOptions = computed(() => {
  const options = props.rows.flatMap((row) => [
    row.primaryLabel,
    row.secondaryLabel,
  ]).filter((label): label is string => !!label);

  return [...new Set(options)].sort((a, b) => a.localeCompare(b));
});

function handleMemberQueryComplete(event: AutoCompleteCompleteEvent): void {
  memberQuerySuggestions.value = filterAutocompleteStrings(
    memberQueryOptions.value,
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

function updateProjectIdsFilter(value: string[] | null | undefined): void {
  updateFilters({ projectIds: value ?? [] });
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


function getRoleClass(role: WorkspaceRole): string {
  return role === 'pm'
    ? 'text-brand text-[13px] font-semibold'
    : 'text-text-dark text-[13px] font-medium';
}
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
      <FilterAutoComplete
        append-to="self"
        input-id="mobile-member-name-filter"
        :model-value="filters.memberQuery"
        placeholder="Filter name or email"
        :suggestions="memberQuerySuggestions"
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
          :pt="giTiempoFieldWidthSelectPt"
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
          :pt="giTiempoFieldWidthSelectPt"
          @update:model-value="updateLastActiveFilter"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-member-projects-filter"
        class="text-text-muted text-[12px] font-medium"
      >Projects assigned</label>
      <MultiSelect
        input-id="mobile-member-projects-filter"
        :model-value="filters.projectIds"
        :options="projectFilterOptions"
        display="chip"
        filter
        option-label="label"
        option-value="value"
        placeholder="All projects"
        show-clear
        :pt="managementTableFilterMultiSelectPt"
        @update:model-value="updateProjectIdsFilter"
      />
    </div>
  </div>

  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <template v-if="loading && rows.length === 0">
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
        <Button
          v-if="row.canManage"
          type="button"
          unstyled
          :aria-expanded="Boolean(expandedRows[row.id])"
          :aria-label="`Edit member ${row.primaryLabel}`"
          :data-testid="`member-mobile-name-${row.id}`"
          :pt="{
            root: {
              class:
                'group flex w-full cursor-pointer items-start gap-3 rounded-none border-0 bg-transparent p-0 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            },
          }"
          @click="emit('edit-member', row.member)"
        >
          <Avatar
            :image="row.avatarImage"
            :label="row.avatarLabel"
            shape="circle"
            class="size-9 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <span class="min-w-0 flex-1">
            <span class="inline-flex max-w-full items-center gap-1.5 font-sans text-[15px] font-semibold leading-none text-brand">
              <span class="truncate">{{ row.primaryLabel }}</span>
              <span
                aria-hidden="true"
                class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                :class="expandedRows[row.id] ? 'bg-accent-tint' : 'bg-app-bg group-hover:bg-accent-tint'"
              >
                <ChevronDownIcon
                  class="size-[11px] stroke-[2.5] transition-all duration-200"
                  :class="expandedRows[row.id] ? 'text-brand rotate-180' : 'text-text-muted group-hover:text-brand'"
                />
              </span>
            </span>
            <span
              v-if="row.secondaryLabel"
              class="text-text-muted block truncate text-[12px]"
            >
              {{ row.secondaryLabel }}
            </span>
          </span>
        </Button>
        <div
          v-else
          class="flex items-start gap-3"
        >
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
            <h3 class="text-text-dark truncate text-[15px] font-semibold">
              {{ row.primaryLabel }}
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
    :body-row-class="adminTableBodyRowClass"
    data-key="id"
    :header-class="adminTableHeaderClass"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    :table-class="adminTableClass"
    table-container-class="overflow-visible rounded-none border-none"
    @update:expanded-rows="updateExpandedRows"
  >
    <template #filters>
      <div
          class="flex flex-1 items-center"
          :class="adminTableMinWidthClass"
        >
        <div class="min-w-0 flex-1 px-3">
          <FilterAutoComplete
            :model-value="filters.memberQuery"
            aria-label="Filter members by name or email"
            placeholder="Filter name or email"
            :suggestions="memberQuerySuggestions"
            @complete="handleMemberQueryComplete"
            @update:model-value="updateMemberQueryFilter"
          />
        </div>

        <div class="w-[120px] pr-3">
          <Select
            :model-value="filters.role"
            :options="roleFilterOptions"
            aria-label="Filter members by role"
            option-label="label"
            option-value="value"
            placeholder="All roles"
            show-clear
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="updateRoleFilter"
          />
        </div>

        <div class="w-[220px] pr-3">
          <MultiSelect
            :model-value="filters.projectIds"
            :options="projectFilterOptions"
            aria-label="Filter members by assigned projects"
            display="chip"
            filter
            option-label="label"
            option-value="value"
            placeholder="All projects"
            show-clear
            :pt="managementTableFilterMultiSelectPt"
            @update:model-value="updateProjectIdsFilter"
          />
        </div>

        <div class="w-[140px] pr-3">
          <Select
            :model-value="filters.lastActive"
            :options="lastActiveFilterOptions"
            aria-label="Filter members by last active"
            option-label="label"
            option-value="value"
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="updateLastActiveFilter"
          />
        </div>
      </div>
    </template>

    <!-- Member: avatar + name + email -->
    <Column :pt="adminTableColumnPt">
      <template #body="{ data }">
        <Button
          v-if="data.canManage"
          type="button"
          unstyled
          :aria-expanded="Boolean(expandedRows[data.id])"
          :aria-label="`Edit member ${data.primaryLabel}`"
          :data-testid="`member-name-${data.id}`"
          :pt="{
            root: {
              class:
                'group flex w-full cursor-pointer items-center gap-3 rounded-none border-0 bg-transparent p-0 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            },
          }"
          @click="emit('edit-member', data.member)"
        >
          <Avatar
            :image="data.avatarImage"
            :label="data.avatarLabel"
            shape="circle"
            class="size-8 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <span class="flex min-w-0 flex-col">
            <span class="inline-flex max-w-full items-center gap-1.5 font-sans text-[14px] font-semibold leading-none text-brand">
              <span class="truncate">{{ data.primaryLabel }}</span>
              <span
                aria-hidden="true"
                class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                :class="expandedRows[data.id] ? 'bg-accent-tint' : 'bg-app-bg group-hover:bg-accent-tint'"
              >
                <ChevronDownIcon
                  class="size-[11px] stroke-[2.5] transition-all duration-200"
                  :class="expandedRows[data.id] ? 'text-brand rotate-180' : 'text-text-muted group-hover:text-brand'"
                />
              </span>
            </span>
            <span
              v-if="data.secondaryLabel"
              class="text-text-muted text-[12px]"
            >{{ data.secondaryLabel }}</span>
          </span>
        </Button>
        <div
          v-else
          class="flex items-center gap-3"
        >
          <Avatar
            :image="data.avatarImage"
            :label="data.avatarLabel"
            shape="circle"
            class="size-8 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="flex min-w-0 flex-col">
            <span class="text-text-dark truncate text-[14px] font-semibold">{{ data.primaryLabel }}</span>
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
      :pt="adminTableColumnPt"
    >
      <template #body="{ data }">
        <span
          :class="getRoleClass(data.member.role)"
          :data-testid="`member-role-${data.id}`"
        >{{
          data.roleLabel
        }}</span>
      </template>
    </Column>

    <!-- Projects Assigned -->
    <Column
      style="width: 220px"
      :pt="adminTableColumnPt"
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
      :pt="adminTableColumnPt"
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

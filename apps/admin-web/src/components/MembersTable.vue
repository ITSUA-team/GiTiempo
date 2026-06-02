<script setup lang="ts">
import {
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline';
import type {
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  managementTableColumnPt,
  managementTableFilterInputClass,
  managementTableFilterMultiSelectPt,
  managementTableFilterSelectPt,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Avatar from 'primevue/avatar';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import type {
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableFilterOption,
  MembersTableFilters,
  MembersTableRow,
} from '@/components/members-table';

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

const emit = defineEmits<{
  'assign-member': [member: WorkspaceMemberResponse];
  'edit-member': [member: WorkspaceMemberResponse];
  'remove-member': [member: WorkspaceMemberResponse];
  'update:expandedRows': [expandedRows: MembersTableExpandedRows];
  'update:filters': [filters: MembersTableFilters];
}>();

const columns: ManagementTableColumn[] = [
  { key: 'member', label: 'Member', width: 'fill' },
  { key: 'role', label: 'Role', width: 120 },
  { key: 'projects', label: 'Projects Assigned', width: 220 },
  { key: 'lastActive', label: 'Last Active', width: 140 },
  { key: 'actions', label: 'Actions', width: 150, align: 'end' },
];

function updateFilters(patch: Partial<MembersTableFilters>): void {
  emit('update:filters', {
    ...props.filters,
    ...patch,
  });
}

function updateGlobalFilter(value: string | undefined): void {
  updateFilters({ global: value ?? '' });
}

function updateMemberQueryFilter(value: string | undefined): void {
  updateFilters({ memberQuery: value ?? '' });
}

function updateRoleFilter(value: WorkspaceRole | null | undefined): void {
  updateFilters({ role: value ?? null });
}

function updateProjectFilter(value: string[] | undefined): void {
  updateFilters({ projectIds: value ?? [] });
}

function updateLastActiveFilter(value: MemberLastActiveFilter | undefined): void {
  updateFilters({ lastActive: value ?? 'any' });
}

function updateExpandedRows(value: MembersTableExpandedRows | undefined): void {
  emit('update:expandedRows', value ?? {});
}
</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Members Table">
      <template #actions>
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
      <InputText
        id="mobile-member-name-filter"
        :model-value="filters.memberQuery"
        class="h-[38px] w-full rounded-[6px] text-[14px]"
        placeholder="Filter name or email"
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
      <MultiSelect
        id="mobile-member-projects-filter"
        :model-value="filters.projectIds"
        :options="projectFilterOptions"
        display="chip"
        filter
        option-label="label"
        option-value="value"
        placeholder="All projects"
        show-clear
        :max-selected-labels="1"
        selected-items-label="{0} projects"
        :pt="managementTableFilterMultiSelectPt"
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

        <template
          v-if="row.canManage"
          #actions
        >
          <ManagementTableRowAction
            v-if="row.canAssignPm"
            :data-testid="`member-mobile-assign-pm-${row.id}`"
            :icon="UserPlusIcon"
            label="Assign PM"
            @click="emit('assign-member', row.member)"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-edit-${row.id}`"
            :icon="PencilSquareIcon"
            label="Edit"
            @click="emit('edit-member', row.member)"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-remove-${row.id}`"
            :icon="TrashIcon"
            label="Remove"
            tone="destructive"
            @click="emit('remove-member', row.member)"
          />
        </template>

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
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[930px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    table-class="min-w-[930px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
    @update:expanded-rows="updateExpandedRows"
  >
    <template #filters>
      <div class="flex min-w-[930px] flex-1 items-center">
        <div class="min-w-0 flex-1 px-3">
          <InputText
            :model-value="filters.memberQuery"
            aria-label="Filter members by name or email"
            :class="managementTableFilterInputClass"
            placeholder="Filter name or email"
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
            :max-selected-labels="1"
            selected-items-label="{0} projects"
            :pt="managementTableFilterMultiSelectPt"
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

        <div class="w-[150px] px-3" />
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
          <div class="flex flex-col">
            <span class="text-text-dark text-[14px] font-semibold">
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

    <!-- Actions -->
    <Column
      style="width: 150px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="data.canManage">
            <ManagementTableRowAction
              v-if="data.canAssignPm"
              :data-testid="`member-assign-pm-${data.id}`"
              :icon="UserPlusIcon"
              label="Assign PM"
              @click="emit('assign-member', data.member)"
            />
            <ManagementTableRowAction
              :data-testid="`member-edit-${data.id}`"
              :icon="PencilSquareIcon"
              label="Edit"
              @click="emit('edit-member', data.member)"
            />
            <ManagementTableRowAction
              :data-testid="`member-remove-${data.id}`"
              :icon="TrashIcon"
              label="Remove"
              tone="destructive"
              @click="emit('remove-member', data.member)"
            />
          </template>
        </div>
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

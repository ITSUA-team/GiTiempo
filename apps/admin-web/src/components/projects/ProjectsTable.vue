<script setup lang="ts">
import type { ProjectListResponse } from '@gitiempo/shared';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import ProjectSettingsPanel from './ProjectSettingsPanel.vue';
import ProjectVisibilityBadge from './ProjectVisibilityBadge.vue';

defineProps<{
    projects: ProjectListResponse;
    memberOptions: { label: string; value: string }[];
    memberSelectOptions: { label: string; value: string }[];
    visibilityOptions: { label: string; value: string }[];
    expandedRows: Record<string, boolean>;
    editMembers: Record<string, string[]>;
    editVisibility: Record<string, 'public' | 'private'>;
    savingRows: Record<string, boolean>;
    loadingAssignments: Record<string, boolean>;
    filterMemberId: string;
}>();

const emit = defineEmits<{
    'update:expandedRows': [value: Record<string, boolean>];
    'update:filterMemberId': [value: string];
    'update:editMembers': [id: string, value: string[]];
    'update:editVisibility': [id: string, value: 'public' | 'private'];
    'toggleRow': [id: string];
    'archiveProject': [id: string];
    'unarchiveProject': [id: string];
    'saveRow': [id: string];
    'collapseRow': [id: string];
}>();
</script>

<template>
  <div class="shadow-card bg-surface flex flex-col gap-4 rounded-[10px] p-5">
    <!-- Table header row: heading + member filter -->
    <div class="flex items-center justify-between">
      <h2 class="text-text-dark text-lg font-semibold">
        Projects Table
      </h2>
      <div class="flex flex-col gap-1.5">
        <p class="text-text-muted text-xs font-medium">
          Assigned member
        </p>
        <Select
          :model-value="filterMemberId"
          :options="memberOptions"
          option-label="label"
          option-value="value"
          class="h-[38px] w-[260px] rounded-[6px]"
          @update:model-value="emit('update:filterMemberId', $event)"
        />
      </div>
    </div>

    <!-- DataTable -->
    <DataTable
      :value="projects"
      :expanded-rows="expandedRows"
      data-key="id"
      :pt="{
        headerCell: 'bg-app-bg h-[44px] text-[13px] font-semibold text-text-dark px-3',
        bodyRow: 'h-[56px] border-t border-divider',
        bodyCell: 'px-3',
        rowExpansionCell: 'p-0',
      }"
      @update:expanded-rows="emit('update:expandedRows', $event as Record<string, boolean>)"
    >
      <!-- Empty state -->
      <template #empty>
        <div class="text-text-muted py-8 text-center text-sm">
          No projects yet.
        </div>
      </template>

      <!-- Project name -->
      <Column
        field="name"
        header="Project"
      >
        <template #body="{ data }">
          <span
            class="text-sm font-semibold"
            :class="data.isActive ? 'text-text-dark' : 'text-text-muted'"
          >{{ data.name }}</span>
        </template>
      </Column>

      <!-- Source -->
      <Column
        header="Source"
        style="width: 140px"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">
            {{ data.source === 'github' ? 'GitHub Repo' : 'Manual' }}
          </span>
        </template>
      </Column>

      <!-- Assigned members -->
      <Column
        header="Assigned members"
        style="width: 220px"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">
            {{ data.memberCount }} members
          </span>
        </template>
      </Column>

      <!-- Hours -->
      <Column
        header="Hours"
        style="width: 120px"
      >
        <template #body="{ data }">
          <span
            class="text-[13px] font-semibold"
            :class="data.isActive ? 'text-text-dark' : 'text-text-muted'"
          >
            {{ data.totalHours }}h
          </span>
        </template>
      </Column>

      <!-- Visibility -->
      <Column
        header="Visibility"
        style="width: 120px"
      >
        <template #body="{ data }">
          <ProjectVisibilityBadge
            :visibility="data.visibility"
            :is-active="data.isActive"
          />
        </template>
      </Column>

      <!-- Actions -->
      <Column
        header="Actions"
        style="width: 150px"
      >
        <template #body="{ data }">
          <div class="flex items-center justify-end gap-2">
            <template v-if="data.isActive">
              <Button
                variant="text"
                label="Edit"
                class="text-brand p-1 text-[13px] font-semibold"
                @click="emit('toggleRow', data.id)"
              />
              <Button
                variant="text"
                label="Archive"
                class="text-destructive p-1 text-[13px] font-semibold"
                @click="emit('archiveProject', data.id)"
              />
            </template>
            <Button
              v-else
              variant="text"
              label="Unarchive"
              class="text-text-muted p-1 text-[13px] font-semibold"
              @click="emit('unarchiveProject', data.id)"
            />
          </div>
        </template>
      </Column>

      <!-- Inline settings expansion -->
      <template #expansion="{ data }">
        <ProjectSettingsPanel
          :model-members="editMembers[data.id] ?? []"
          :model-visibility="editVisibility[data.id] ?? 'public'"
          :member-options="memberSelectOptions"
          :visibility-options="visibilityOptions"
          :saving="savingRows[data.id] ?? false"
          :loading-members="loadingAssignments[data.id] ?? false"
          @update:model-members="emit('update:editMembers', data.id, $event)"
          @update:model-visibility="emit('update:editVisibility', data.id, $event)"
          @save="emit('saveRow', data.id)"
          @cancel="emit('collapseRow', data.id)"
        />
      </template>
    </DataTable>
  </div>
</template>

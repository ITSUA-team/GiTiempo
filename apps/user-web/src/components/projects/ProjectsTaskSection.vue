<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import {
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import {
  ManagementTableEmptyState,
  ManagementTableRowAction,
  SurfaceCard,
} from "@gitiempo/web-shared";

interface ProjectsTaskSectionProps {
  // eslint-disable-next-line no-unused-vars
  formatUpdatedLabel: (updatedAt: string) => string;
  isDeletingTaskId: string | null;
  project: ProjectResponse;
  tasks: TaskResponse[];
}

const props = defineProps<ProjectsTaskSectionProps>();

const emit = defineEmits<{
  addTask: [projectId: string];
  deleteTask: [task: TaskResponse];
  editTask: [task: TaskResponse];
}>();

const statusColumnWidth = "8.125rem";
const updatedColumnWidth = "10.625rem";
const actionsColumnWidth = "8.75rem";

function formatTaskCount(count: number): string {
  return `${count} active task${count === 1 ? "" : "s"}`;
}

function getStatusLabel(task: TaskResponse): string {
  return task.status === "closed" ? "Closed" : "Open";
}

function getStatusPt(task: TaskResponse) {
  return {
    root:
      task.status === "closed"
        ? "bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1"
        : "rounded-sm bg-accent-tint px-2 py-1 text-brand",
    label: "text-xs font-semibold",
  };
}
</script>

<template>
  <section class="flex flex-col gap-2.5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-base font-semibold">
          {{ props.project.name }}
        </h2>
        <p class="text-text-muted text-xs">
          {{ formatTaskCount(props.tasks.length) }}
        </p>
      </div>

      <Button
        data-testid="project-section-add-task"
        type="button"
        label="+ Add task"
        severity="secondary"
        variant="outlined"
        size="small"
        @click="emit('addTask', props.project.id)"
      />
    </div>

    <SurfaceCard
      body-class="overflow-x-auto"
      border
      padding-class="p-0"
    >
      <DataTable
        data-key="id"
        :pt="{
          bodyCell: 'px-3 py-0',
          bodyRow: 'h-[52px] border-b border-divider last:border-b-0 hover:bg-app-bg',
          columnHeaderContent: 'justify-start',
          headerCell: 'bg-app-bg border-b border-divider px-3 py-3 text-[13px] font-medium text-text-muted',
          table: 'w-full',
        }"
        class="w-full"
        row-hover
        table-style="min-width: 740px; table-layout: fixed"
        :value="props.tasks"
      >
        <template #empty>
          <ManagementTableEmptyState
            description="Add a task to start tracking work for this project."
            title="No active tasks yet"
          />
        </template>

        <Column header="Task">
          <template #body="slotProps">
            <div class="text-text-dark truncate text-sm font-medium">
              {{ slotProps.data.title }}
            </div>
          </template>
        </Column>

        <Column
          header="Status"
          :style="{ width: statusColumnWidth }"
        >
          <template #body="slotProps">
            <div>
              <Tag
                :pt="getStatusPt(slotProps.data)"
                :value="getStatusLabel(slotProps.data)"
              />
            </div>
          </template>
        </Column>

        <Column
          header="Updated"
          :style="{ width: updatedColumnWidth }"
        >
          <template #body="slotProps">
            <div class="text-text-muted text-[13px]">
              {{ props.formatUpdatedLabel(slotProps.data.updatedAt) }}
            </div>
          </template>
        </Column>

        <Column
          header="Actions"
          :style="{ width: actionsColumnWidth }"
        >
          <template #body="slotProps">
            <div class="flex items-center justify-end gap-2">
              <ManagementTableRowAction
                data-testid="project-task-edit"
                :icon="PencilSquareIcon"
                label="Edit"
                @click="emit('editTask', slotProps.data)"
              />
              <ManagementTableRowAction
                data-testid="project-task-delete"
                :icon="TrashIcon"
                label="Delete"
                :loading="props.isDeletingTaskId === slotProps.data.id"
                tone="destructive"
                @click="emit('deleteTask', slotProps.data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </SurfaceCard>
  </section>
</template>

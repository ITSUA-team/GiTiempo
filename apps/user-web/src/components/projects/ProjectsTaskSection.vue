<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import Tag from "primevue/tag";
import {
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import {
  ManagementTableEmptyState,
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

interface ProjectsTaskSectionProps {
  // eslint-disable-next-line no-unused-vars
  formatUpdatedLabel: (updatedAt: string) => string;
  isDeletingTaskId: string | null;
  project: ProjectResponse;
  tasks: TaskResponse[];
}

const props = defineProps<ProjectsTaskSectionProps>();
const isMobileViewport = useIsMobileViewport();

const emit = defineEmits<{
  addTask: [projectId: string];
  deleteTask: [task: TaskResponse];
  editTask: [task: TaskResponse];
}>();

const statusColumnWidth = "8.125rem";
const updatedColumnWidth = "10.625rem";
const actionsColumnWidth = "8.75rem";

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "status", label: "Status", width: 130 },
  { key: "updated", label: "Updated", width: 170 },
  { key: "actions", label: "Actions", width: 140, align: "end" },
] satisfies ManagementTableColumn[];

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

    <div
      v-if="isMobileViewport"
      class="flex flex-col gap-3"
    >
      <MobileRecordCard
        v-for="task in props.tasks"
        :key="task.id"
        data-testid="project-task-mobile-card"
      >
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-text-dark truncate text-sm font-medium">
            {{ task.title }}
          </p>

          <div class="flex items-center justify-between gap-3">
            <Tag
              :pt="getStatusPt(task)"
              :value="getStatusLabel(task)"
            />
            <span class="text-text-muted text-[13px]">
              {{ props.formatUpdatedLabel(task.updatedAt) }}
            </span>
          </div>
        </div>

        <template #actions>
          <ManagementTableRowAction
            :data-testid="`project-task-mobile-edit-${task.id}`"
            :icon="PencilSquareIcon"
            label="Edit"
            @click="emit('editTask', task)"
          />
          <ManagementTableRowAction
            :data-testid="`project-task-mobile-delete-${task.id}`"
            :icon="TrashIcon"
            label="Delete"
            :loading="props.isDeletingTaskId === task.id"
            tone="destructive"
            @click="emit('deleteTask', task)"
          />
        </template>
      </MobileRecordCard>

      <ManagementTableEmptyState
        v-if="props.tasks.length === 0"
        description="Add a task to start tracking work for this project."
        title="No active tasks yet"
      />
    </div>

    <ManagementTableShell
      v-else
      body-row-class="h-[52px] bg-transparent hover:bg-app-bg"
      :columns="columns"
      data-key="id"
      header-class="border-divider bg-app-bg text-text-muted flex h-[44px] items-center border-b font-sans text-[13px] font-medium"
      :loading="false"
      shell-class="border-divider overflow-hidden rounded-lg border bg-surface"
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-auto rounded-none border-none"
      :value="props.tasks"
    >
      <template #empty>
        <ManagementTableEmptyState
          description="Add a task to start tracking work for this project."
          title="No active tasks yet"
        />
      </template>

      <Column :pt="managementTableColumnPt">
        <template #body="slotProps">
          <div class="text-text-dark truncate text-sm font-medium">
            {{ slotProps.data.title }}
          </div>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
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
        :pt="managementTableColumnPt"
        :style="{ width: updatedColumnWidth }"
      >
        <template #body="slotProps">
          <div class="text-text-muted text-[13px]">
            {{ props.formatUpdatedLabel(slotProps.data.updatedAt) }}
          </div>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
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
    </ManagementTableShell>
  </section>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon } from "@heroicons/vue/24/outline";
import Button from "primevue/button";
import Column from "primevue/column";
import Tag from "primevue/tag";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import {
  ManagementTableEmptyState,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

interface ProjectsTaskSectionProps {
  // eslint-disable-next-line no-unused-vars
  formatUpdatedLabel: (updatedAt: string) => string;
  project: ProjectResponse;
  tasks: TaskResponse[];
}

const props = defineProps<ProjectsTaskSectionProps>();
const isMobileViewport = useIsMobileViewport();

const emit = defineEmits<{
  addTask: [projectId: string];
  editTask: [task: TaskResponse];
}>();

const statusColumnWidth = "8.125rem";
const updatedColumnWidth = "10.625rem";

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "status", label: "Status", width: 130 },
  { key: "updated", label: "Updated", width: 170 },
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
        aria-label="Add task"
        class="h-[38px] w-[38px] rounded-[6px] p-0"
        icon="pi pi-plus"
        title="Add task"
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
          <button
            type="button"
            class="text-brand inline-flex w-fit max-w-full cursor-pointer items-center gap-1.5 text-left text-sm font-medium break-words whitespace-normal hover:underline"
            data-testid="project-task-mobile-title"
            @click="emit('editTask', task)"
          >
            <span class="min-w-0 break-words whitespace-normal">
              {{ task.title }}
            </span>
            <span
              aria-hidden="true"
              class="size-3.5 shrink-0"
              data-testid="project-task-mobile-title-arrow"
            >
              <ArrowUpRightIcon class="size-full" />
            </span>
          </button>

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
      header-class="border-divider bg-app-bg text-text-dark flex h-[44px] items-center border-b font-sans text-[13px] font-semibold"
      :loading="false"
      shell-class="border-divider overflow-hidden rounded-lg border bg-surface-primary"
      table-class="min-w-[560px] w-full table-fixed border-collapse"
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
          <button
            type="button"
            class="text-brand inline-flex max-w-full cursor-pointer items-center gap-1.5 text-left text-sm font-medium break-words whitespace-normal hover:underline"
            data-testid="project-task-title"
            @click="emit('editTask', slotProps.data)"
          >
            <span class="min-w-0 break-words whitespace-normal">
              {{ slotProps.data.title }}
            </span>
            <span
              aria-hidden="true"
              class="size-3.5 shrink-0"
              data-testid="project-task-title-arrow"
            >
              <ArrowUpRightIcon class="size-full" />
            </span>
          </button>
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
    </ManagementTableShell>
  </section>
</template>

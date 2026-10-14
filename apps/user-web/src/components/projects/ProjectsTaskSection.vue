<script setup lang="ts">
import Column from "primevue/column";
import Tag from "primevue/tag";
import { PlusIcon } from "@heroicons/vue/24/outline";
import Button from "primevue/button";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  EntryActionButton,
  ManagementTableEmptyState,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  managementTableHeaderClass,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import TaskNameLink from "@/components/tasks/TaskNameLink.vue";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TimerActionButton from "@/components/timer/TimerActionButton.vue";

interface ProjectsTaskSectionProps {
  activeTimerTaskId?: string | null;
  formatUpdatedLabel: (updatedAt: string) => string;
  isCurrentTimerLoading?: boolean;
  project: ProjectResponse;
  startingTimerTaskId?: string | null;
  stoppingTimerTaskId?: string | null;
  tasks: TaskResponse[];
}

const props = defineProps<ProjectsTaskSectionProps>();
const isMobileViewport = useIsMobileViewport();
const isExternalProject = computed(
  () => props.project.trackingMode === "external-reference",
);
const externalTagPt = {
  root: "bg-accent-tint text-brand shrink-0 rounded-sm px-2.5 py-1.5",
  label: "text-xs font-semibold leading-[15px]",
};
const externalMobileCardStyle = {
  padding: "calc(var(--spacing) * 3)",
  borderRadius: "var(--radius-md)",
  borderWidth: "0",
};

const emit = defineEmits<{
  addTask: [projectId: string];
  editTask: [task: TaskResponse];
  openActiveTimer: [];
  startTimer: [task: TaskResponse];
  stopTimer: [task: TaskResponse];
}>();

const statusColumnWidth = "8.125rem";
const updatedColumnWidth = "10.625rem";
const ownTimeHelpText =
  "You can only see your own time and tasks with your time entries.";
const ownTimeHelpId = computed(
  () => `own-time-project-help-${props.project.id}`,
);
const isOwnTimeHelpOpen = ref(false);
const ownTimeHelpContainer = ref<HTMLElement | null>(null);
const ownTimeHelpTooltip = ref<HTMLElement | null>(null);
const ownTimeHelpTooltipStyle = ref<Record<string, string>>({});

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "status", label: "Status", width: 130 },
  { key: "updated", label: "Updated", width: 170 },
] satisfies ManagementTableColumn[];

const projectTasksTableBodyRowClass =
  "border-divider h-[52px] border-b transition-colors last:border-b-0 hover:bg-app-bg";
const projectTasksTableHeaderClass = `${managementTableHeaderClass} min-w-[740px]`;

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
        ? "bg-status-warn-bg text-status-warn-text rounded-sm px-2.5 py-1.5"
        : "rounded-sm bg-accent-tint px-2.5 py-1.5 text-brand",
    label: "text-xs font-semibold leading-[15px]",
  };
}

function isTaskTimerRunning(task: TaskResponse): boolean {
  return props.activeTimerTaskId === task.id;
}

function isTimerOperationPending(): boolean {
  return (
    props.isCurrentTimerLoading === true ||
    props.startingTimerTaskId != null ||
    props.stoppingTimerTaskId != null
  );
}

function isStartTimerDisabled(): boolean {
  return isTimerOperationPending() || props.activeTimerTaskId != null;
}

function isTimerActionDisabled(task: TaskResponse): boolean {
  return isTaskTimerRunning(task)
    ? isTimerOperationPending()
    : isStartTimerDisabled();
}

function opensStopFirstGuidance(task: TaskResponse): boolean {
  return (
    !isTimerOperationPending() &&
    props.activeTimerTaskId != null &&
    !isTaskTimerRunning(task)
  );
}

function getTimerActionTarget(task: TaskResponse) {
  return {
    id: task.id,
    title: task.title,
  };
}

function canManageTask(task: TaskResponse): boolean {
  return task.capabilities.canManageTasks;
}

async function openOwnTimeHelp(): Promise<void> {
  isOwnTimeHelpOpen.value = true;

  if (!isMobileViewport.value) {
    return;
  }

  await nextTick();

  const anchor = ownTimeHelpContainer.value;
  const tooltip = ownTimeHelpTooltip.value;

  if (!anchor || !tooltip) {
    return;
  }

  const margin = 16;
  const anchorRect = anchor.getBoundingClientRect();
  const tooltipWidth = tooltip.getBoundingClientRect().width;
  const minimumLeft = margin + tooltipWidth / 2;
  const maximumLeft = window.innerWidth - margin - tooltipWidth / 2;
  const left = Math.min(
    Math.max(anchorRect.left + anchorRect.width / 2, minimumLeft),
    maximumLeft,
  );

  ownTimeHelpTooltipStyle.value = {
    left: `${left}px`,
    top: `${anchorRect.bottom + 4}px`,
  };
}

function closeOwnTimeHelp(): void {
  isOwnTimeHelpOpen.value = false;
}

function handleOwnTimeHelpKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    closeOwnTimeHelp();
  }
}

function handleDocumentPointerDown(event: PointerEvent): void {
  if (
    ownTimeHelpContainer.value &&
    !ownTimeHelpContainer.value.contains(event.target as Node)
  ) {
    closeOwnTimeHelp();
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});

function handleTimerAction(task: TaskResponse): void {
  if (isTimerOperationPending()) {
    return;
  }

  if (isTaskTimerRunning(task)) {
    emit("stopTimer", task);
    return;
  }

  if (opensStopFirstGuidance(task)) {
    emit("openActiveTimer");
    return;
  }

  emit("startTimer", task);
}
</script>

<template>
  <section class="flex flex-col gap-2.5">
    <div
      class="flex items-center justify-between gap-3"
      :class="isExternalProject && isMobileViewport ? 'min-h-16' : undefined"
    >
      <div
        class="flex min-w-0 flex-1 flex-col"
        :class="isMobileViewport ? 'gap-px' : 'gap-1'"
      >
        <h2 class="text-text-dark truncate text-base leading-[19px] font-semibold">
          {{ props.project.name }}
        </h2>
        <p
          class="text-text-muted"
          :class="isMobileViewport ? 'text-[11px] leading-[13px]' : 'text-xs leading-[15px]'"
        >
          {{ formatTaskCount(props.tasks.length) }}
        </p>
        <Tag
          v-if="isExternalProject && isMobileViewport"
          value="External"
          class="self-start"
          :pt="externalTagPt"
        />
      </div>
      <Tag
        v-if="isExternalProject && !isMobileViewport"
        value="External"
        :pt="externalTagPt"
        class="self-center"
      />
      <div
        v-if="props.project.accessScope === 'own-time'"
        ref="ownTimeHelpContainer"
        class="relative"
        @mouseenter="openOwnTimeHelp"
        @mouseleave="closeOwnTimeHelp"
      >
        <Button
          :aria-describedby="isOwnTimeHelpOpen ? ownTimeHelpId : undefined"
          :aria-expanded="isOwnTimeHelpOpen"
          :aria-label="ownTimeHelpText"
          severity="secondary"
          text
          :pt="{ root: 'border-divider text-text-muted size-11 border shrink-0 rounded-sm p-0 text-base font-semibold' }"
          @click="openOwnTimeHelp"
          @focus="openOwnTimeHelp"
          @focusout="closeOwnTimeHelp"
          @keydown="handleOwnTimeHelpKeydown"
        >
          <span aria-hidden="true">?</span>
        </Button>
        <span
          v-if="isOwnTimeHelpOpen"
          :id="ownTimeHelpId"
          ref="ownTimeHelpTooltip"
          role="tooltip"
          :class="[
            'bg-text-dark text-surface-primary shadow-popover z-10 w-[340px] max-w-[calc(100vw-2rem)] rounded-sm p-3 text-xs leading-[17px]',
            isMobileViewport ? 'fixed -translate-x-1/2' : 'absolute top-12 right-0',
          ]"
          :style="isMobileViewport ? ownTimeHelpTooltipStyle : undefined"
        >{{ ownTimeHelpText }}</span>
      </div>
      <EntryActionButton
        v-if="props.project.capabilities.canManageTasks"
        data-testid="project-section-add-task"
        :icon="PlusIcon"
        label="Add task"
        @click="emit('addTask', props.project.id)"
      />
    </div>

    <div
      v-if="isMobileViewport"
      class="flex flex-col"
      :class="isExternalProject ? 'gap-2' : 'gap-3'"
    >
      <MobileRecordCard
        v-for="task in props.tasks"
        :key="task.id"
        data-testid="project-task-mobile-card"
        :style="isExternalProject ? externalMobileCardStyle : undefined"
      >
        <div class="flex min-w-0 flex-col gap-2">
          <div
            class="flex min-h-8 min-w-0 items-center justify-between gap-3"
            data-testid="project-task-mobile-header"
          >
            <div class="flex max-w-full min-w-0 items-center gap-2">
              <TaskNameLink
                v-if="canManageTask(task)"
                :label="task.title"
                :open-label="`Edit task ${task.title}`"
                test-id="project-task-mobile-title"
                @open="emit('editTask', task)"
              />
              <span
                v-else
                class="text-text-dark truncate text-sm font-medium"
                data-testid="project-task-mobile-title"
              >{{ task.title }}</span>
              <TaskGitHubIssueLink
                v-if="task.githubIssue"
                :issue="task.githubIssue"
                :show-number="!isExternalProject"
                :test-id="`project-task-mobile-github-${task.id}`"
              />
            </div>
            <TimerActionButton
              v-if="task.status !== 'closed'"
              :action="isTaskTimerRunning(task) ? 'stop' : 'start'"
              :class="isExternalProject ? '[&_svg]:size-[18px]' : undefined"
              :disabled="isTimerActionDisabled(task)"
              :target="getTimerActionTarget(task)"
              :is-loading="props.startingTimerTaskId === task.id ||
                props.stoppingTimerTaskId === task.id"
              :show-stop-first-guidance="opensStopFirstGuidance(task)"
              test-id-prefix="project-task-mobile"
              @trigger="() => handleTimerAction(task)"
            />
          </div>

          <span
            v-if="isExternalProject"
            class="text-text-muted text-[11px] leading-[13px]"
          >{{ getStatusLabel(task) }} · {{ props.formatUpdatedLabel(task.updatedAt) }}</span>
          <div
            v-else
            class="flex items-center justify-between gap-3"
          >
            <Tag
              :pt="getStatusPt(task)"
              :value="getStatusLabel(task)"
            />
            <span class="text-text-muted text-[13px]">
              {{ props.formatUpdatedLabel(task.updatedAt) }}
            </span>
          </div>
          <Tag
            v-if="isExternalProject"
            value="External"
            class="self-start"
            :pt="externalTagPt"
          />
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
      :body-row-class="projectTasksTableBodyRowClass"
      :columns="columns"
      data-key="id"
      :header-class="projectTasksTableHeaderClass"
      :loading="false"
      shell-class="border-divider overflow-x-auto rounded-lg border bg-surface-primary"
      single-scroll
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
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
          <div class="flex max-w-full min-w-0 items-center gap-2">
            <TimerActionButton
              v-if="slotProps.data.status !== 'closed'"
              :action="isTaskTimerRunning(slotProps.data) ? 'stop' : 'start'"
              :class="isExternalProject ? '[&_svg]:size-[18px]' : undefined"
              :disabled="isTimerActionDisabled(slotProps.data)"
              :target="getTimerActionTarget(slotProps.data)"
              :is-loading="props.startingTimerTaskId === slotProps.data.id ||
                props.stoppingTimerTaskId === slotProps.data.id"
              :show-stop-first-guidance="opensStopFirstGuidance(slotProps.data)"
              test-id-prefix="project-task"
              @trigger="() => handleTimerAction(slotProps.data)"
            />
            <TaskNameLink
              v-if="canManageTask(slotProps.data)"
              :label="slotProps.data.title"
              :open-label="`Edit task ${slotProps.data.title}`"
              test-id="project-task-title"
              @open="emit('editTask', slotProps.data)"
            />
            <span
              v-else
              class="text-text-dark truncate text-sm font-medium"
              data-testid="project-task-title"
            >{{ slotProps.data.title }}</span>
            <TaskGitHubIssueLink
              v-if="slotProps.data.githubIssue"
              :issue="slotProps.data.githubIssue"
              :show-number="!isExternalProject"
              :test-id="`project-task-github-${slotProps.data.id}`"
            />
            <Tag
              v-if="isExternalProject"
              value="External"
              :pt="externalTagPt"
            />
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
    </ManagementTableShell>
  </section>
</template>

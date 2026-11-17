<script setup lang="ts">
import { computed } from "vue";
import type { SyncedGitHubIssue } from "@gitiempo/shared";

import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TaskNameLink from "@/components/tasks/TaskNameLink.vue";
import TimerActionButton from "@/components/timer/TimerActionButton.vue";
import {
  getRecordEntryTaskOpenLabel,
  getRecordEntryTaskTestId,
  type RecordEntryTestIdPrefix,
} from "./record-entry-actions";

interface RecordEntryTaskCellProps {
  description: string | null;
  entryId: string;
  githubIssue: SyncedGitHubIssue | null;
  isInteractive: boolean;
  isRunning: boolean;
  isStartDisabled: boolean;
  isStartPending: boolean;
  isStopDisabled: boolean;
  isStopPending: boolean;
  showStopFirstGuidance: boolean;
  taskTitle: string;
  testIdPrefix: RecordEntryTestIdPrefix;
  variant: "desktop" | "mobile";
}

const props = defineProps<RecordEntryTaskCellProps>();

const emit = defineEmits<{
  open: [];
  goToActiveTimer: [];
  startTimer: [];
  stopTimer: [];
}>();

const containerClass = computed(() =>
  props.variant === "mobile"
    ? "flex min-w-0 items-start gap-3"
    : "flex min-w-0 items-center gap-2",
);

const titleColumnClass = computed(() =>
  props.variant === "mobile"
    ? "flex min-w-0 flex-col gap-1"
    : "flex min-w-0 flex-col",
);

function handleStartTimer(): void {
  if (props.isRunning) {
    return;
  }

  if (props.isStartDisabled && !props.showStopFirstGuidance) {
    return;
  }

  if (props.isStartPending) {
    return;
  }

  if (props.isStartDisabled) {
    emit("goToActiveTimer");
    return;
  }

  emit("startTimer");
}

function handleStopTimer(): void {
  if (!props.isRunning || props.isStopDisabled) {
    return;
  }

  emit("stopTimer");
}
</script>

<template>
  <div :class="containerClass">
    <TimerActionButton
      v-if="!props.isRunning"
      action="start"
      :disabled="props.isStartDisabled"
      :target="{ id: props.entryId, title: props.taskTitle }"
      :is-loading="props.isStartPending"
      :show-stop-first-guidance="props.showStopFirstGuidance"
      :test-id-prefix="props.testIdPrefix"
      @trigger="handleStartTimer"
    />
    <TimerActionButton
      v-else
      action="stop"
      :disabled="props.isStopDisabled"
      :target="{ id: props.entryId, title: props.taskTitle }"
      :is-loading="props.isStopPending"
      :test-id-prefix="props.testIdPrefix"
      @trigger="handleStopTimer"
    />

    <div :class="titleColumnClass">
      <div class="flex max-w-full min-w-0 items-center gap-1">
        <TaskNameLink
          :clickable="props.isInteractive"
          :label="props.taskTitle"
          :open-label="getRecordEntryTaskOpenLabel(props.taskTitle, props.isRunning)"
          :test-id="getRecordEntryTaskTestId(props.entryId, props.testIdPrefix, props.isRunning)"
          @open="emit('open')"
        />
        <TaskGitHubIssueLink
          v-if="props.githubIssue"
          :issue="props.githubIssue"
          :test-id="`${props.testIdPrefix}-github-${props.entryId}`"
        />
      </div>
      <p
        v-if="props.description"
        class="text-text-muted truncate text-xs"
      >
        {{ props.description }}
      </p>
    </div>
  </div>
</template>

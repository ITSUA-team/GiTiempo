<script setup lang="ts">
import { computed } from "vue";
import { PlayIcon, StopIcon } from "@heroicons/vue/24/solid";
import Button from "primevue/button";

interface TimerActionTarget {
  id: string;
  title: string;
}

const props = defineProps<{
  action: "start" | "stop";
  disabled?: boolean;
  isLoading?: boolean;
  showStopFirstGuidance?: boolean;
  target: TimerActionTarget;
  testIdPrefix:
    | "dashboard-recent-entry"
    | "dashboard-recent-entry-mobile"
    | "project-task"
    | "project-task-mobile"
    | "time-entry"
    | "time-entry-mobile";
}>();

const emit = defineEmits<{
  trigger: [target: TimerActionTarget];
}>();

const buttonBaseClass =
  "inline-flex h-8 w-12 min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-[6px] p-0 disabled:cursor-not-allowed";
const startDisabledClass =
  `${buttonBaseClass} border-divider bg-surface-primary text-text-subtle border`;
const timerActionSpinnerClass =
  "size-4 animate-spin rounded-full border-2 border-text-inverse/30 border-t-text-inverse";

const isStartAction = computed(() => props.action === "start");
const label = computed(() =>
  isStartAction.value
    ? `Start timer for ${props.target.title}`
    : `Stop timer for ${props.target.title}`,
);
const rootClass = computed(() =>
  props.isLoading === true
    ? buttonBaseClass
    : isStartAction.value && props.disabled === true
      ? startDisabledClass
      : buttonBaseClass,
);
const iconClass = computed(() =>
  isStartAction.value && props.disabled === true
    ? "text-text-subtle size-5"
    : "text-text-inverse size-5",
);
const opensStopFirstGuidance = computed(
  () =>
    isStartAction.value &&
    props.disabled === true &&
    props.showStopFirstGuidance === true,
);
const isNativeDisabled = computed(
  () =>
    props.disabled === true &&
    (!opensStopFirstGuidance.value || props.isLoading === true),
);
const tooltip = computed(() =>
  opensStopFirstGuidance.value
    ? "Open task and timer to stop the current timer first"
    : label.value,
);
const testId = computed(() =>
  `${props.testIdPrefix}-${props.action}-timer-${props.target.id}`,
);

function handleClick(): void {
  if (isNativeDisabled.value) {
    return;
  }

  emit("trigger", props.target);
}
</script>

<template>
  <Button
    v-tooltip.bottom="tooltip"
    :aria-label="label"
    :aria-busy="props.isLoading === true ? 'true' : undefined"
    :aria-disabled="props.disabled === true ? 'true' : undefined"
    :data-testid="testId"
    :disabled="isNativeDisabled"
    type="button"
    :pt="{
      root: { class: rootClass },
    }"
    @click="handleClick"
  >
    <span
      v-if="props.isLoading"
      aria-hidden="true"
      :class="timerActionSpinnerClass"
      data-testid="timer-action-spinner"
    />
    <span
      v-else
      :data-icon="isStartAction ? 'play' : 'stop'"
    >
      <PlayIcon
        v-if="isStartAction"
        aria-hidden="true"
        :class="iconClass"
      />
      <StopIcon
        v-else
        aria-hidden="true"
        :class="iconClass"
      />
    </span>
  </Button>
</template>

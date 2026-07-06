<script setup lang="ts">
import { computed } from "vue";
import { PlayIcon, StopIcon } from "@heroicons/vue/24/solid";
import Button from "primevue/button";

interface TimerActionEntry {
  endedAt: string | null;
  id: string;
  task: {
    title: string;
  };
}

const props = defineProps<{
  action: "start" | "stop";
  disabled?: boolean;
  entry: TimerActionEntry;
  isLoading?: boolean;
  testIdPrefix:
    | "dashboard-recent-entry"
    | "dashboard-recent-entry-mobile"
    | "time-entry"
    | "time-entry-mobile";
}>();

const emit = defineEmits<{
  trigger: [entry: TimerActionEntry];
}>();

const buttonBaseClass = "h-8 w-12 min-w-0 shrink-0 rounded-[6px] p-0";
const startDisabledClass =
  `${buttonBaseClass} border-divider bg-surface-primary text-text-subtle border`;

const isStartAction = computed(() => props.action === "start");
const label = computed(() =>
  isStartAction.value
    ? `Start timer for ${props.entry.task.title}`
    : `Stop timer for ${props.entry.task.title}`,
);
const rootClass = computed(() =>
  isStartAction.value && props.disabled === true
    ? startDisabledClass
    : buttonBaseClass,
);
const iconClass = computed(() =>
  isStartAction.value && props.disabled === true
    ? "text-text-subtle size-5"
    : "text-text-inverse size-5",
);
const tooltip = computed(() =>
  isStartAction.value && props.disabled === true ? undefined : label.value,
);
const testId = computed(() =>
  `${props.testIdPrefix}-${props.action}-timer-${props.entry.id}`,
);

function handleClick(): void {
  if (props.disabled === true) {
    return;
  }

  emit("trigger", props.entry);
}
</script>

<template>
  <Button
    v-tooltip.bottom="tooltip"
    :aria-label="label"
    :data-testid="testId"
    :disabled="props.disabled"
    :loading="props.isLoading"
    type="button"
    :pt="{
      root: { class: rootClass },
    }"
    @click="handleClick"
  >
    <span :data-icon="isStartAction ? 'play' : 'stop'">
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

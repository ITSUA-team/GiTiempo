<script setup lang="ts">
import ProgressBar from "primevue/progressbar";
import Tag from "primevue/tag";
import { SectionHeader, SurfaceCard } from "@gitiempo/web-shared";

import type { DashboardWeeklyFocus } from "@/composables/useDashboardOverview";

const props = defineProps<{
  focus: DashboardWeeklyFocus;
}>();

function getFallbackDescription(label: string): string {
  return label === "Top Project"
    ? "No tracked project focus for the current week yet."
    : "No tracked task focus for the current week yet.";
}
</script>

<template>
  <SurfaceCard
    body-class="flex flex-col gap-4"
    padding-class="p-5"
  >
    <SectionHeader
      description="Your strongest project and task based on this week's tracked entries."
      title="Top Focus This Week"
    >
      <template #actions>
        <Tag
          rounded
          severity="secondary"
          value="This week"
        />
      </template>
    </SectionHeader>

    <div class="grid gap-4 xl:grid-cols-2">
      <div class="bg-app-bg flex flex-col gap-3 rounded-lg p-4">
        <p class="text-text-muted text-xs font-semibold tracking-wide uppercase">
          Top Project
        </p>
        <p class="text-text-dark text-2xl font-semibold">
          {{ props.focus.project?.title ?? 'No tracked project yet' }}
        </p>
        <p class="text-text-muted text-[13px]">
          {{ props.focus.project?.description ?? getFallbackDescription('Top Project') }}
        </p>
        <ProgressBar
          :show-value="false"
          :value="props.focus.project?.sharePercent ?? 0"
          :pt="{
            root: 'bg-divider h-2 overflow-hidden rounded-full',
            value: 'bg-brand rounded-full',
          }"
        />
        <p class="text-text-muted text-xs">
          {{ props.focus.project?.shareLabel ?? 'Weekly share appears after your first current-week entry.' }}
        </p>
      </div>

      <div class="bg-app-bg flex flex-col gap-3 rounded-lg p-4">
        <p class="text-text-muted text-xs font-semibold tracking-wide uppercase">
          Top Task
        </p>
        <p class="text-text-dark text-2xl font-semibold">
          {{ props.focus.task?.title ?? 'No tracked task yet' }}
        </p>
        <p class="text-text-muted text-[13px]">
          {{ props.focus.task?.description ?? getFallbackDescription('Top Task') }}
        </p>
        <ProgressBar
          :show-value="false"
          :value="props.focus.task?.sharePercent ?? 0"
          :pt="{
            root: 'bg-divider h-2 overflow-hidden rounded-full',
            value: 'bg-brand rounded-full',
          }"
        />
        <p class="text-text-muted text-xs">
          {{ props.focus.task?.shareLabel ?? 'Task repetition appears after your first current-week entry.' }}
        </p>
      </div>
    </div>
  </SurfaceCard>
</template>

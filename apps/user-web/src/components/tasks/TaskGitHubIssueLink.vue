<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRightIcon } from "@heroicons/vue/24/outline";
import type { SyncedGitHubIssue } from "@gitiempo/shared";

import {
  buildGitHubIssueBadge,
  buildGitHubIssueLabel,
  buildGitHubIssueUrl,
} from "@/lib/github-issue-links";

const props = withDefaults(
  defineProps<{
    issue: SyncedGitHubIssue;
    label?: string;
    /** Show the issue number (e.g. "#184") beside the icon, not just the icon. */
    showNumber?: boolean;
    testId?: string;
  }>(),
  {
    label: undefined,
    showNumber: false,
    testId: undefined,
  },
);

const href = computed(() => buildGitHubIssueUrl(props.issue));
const accessibleLabel = computed(
  () => props.label ?? buildGitHubIssueLabel(props.issue),
);
const badge = computed(() => buildGitHubIssueBadge(props.issue));
</script>

<template>
  <a
    v-if="props.showNumber"
    class="text-brand hover:bg-brand/10 focus-visible:outline-brand inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full px-1.5 align-middle text-[12px] font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    :aria-label="accessibleLabel"
    :data-testid="props.testId"
    :href="href"
    rel="noopener noreferrer"
    target="_blank"
    @click.stop
  >
    {{ badge }}
    <ArrowUpRightIcon
      aria-hidden="true"
      class="size-3"
    />
  </a>
  <a
    v-else
    class="text-brand hover:text-brand/80 focus-visible:outline-brand inline-flex size-4 shrink-0 items-center justify-center rounded-sm align-middle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    :aria-label="accessibleLabel"
    :data-testid="props.testId"
    :href="href"
    rel="noopener noreferrer"
    target="_blank"
    @click.stop
  >
    <ArrowUpRightIcon
      aria-hidden="true"
      class="size-3.5"
    />
  </a>
</template>

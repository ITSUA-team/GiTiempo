<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRightIcon } from "@heroicons/vue/24/outline";
import type { SyncedGitHubIssue } from "@gitiempo/shared";

import {
  buildGitHubIssueLabel,
  buildGitHubIssueUrl,
} from "@/lib/github-issue-links";

const props = withDefaults(
  defineProps<{
    issue: SyncedGitHubIssue;
    label?: string;
    testId?: string;
  }>(),
  {
    label: undefined,
    testId: undefined,
  },
);

const href = computed(() => buildGitHubIssueUrl(props.issue));
const accessibleLabel = computed(
  () => props.label ?? buildGitHubIssueLabel(props.issue),
);
</script>

<template>
  <a
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

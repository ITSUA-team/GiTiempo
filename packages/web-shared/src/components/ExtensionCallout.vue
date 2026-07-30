<script setup lang="ts">
import { ArrowRightIcon } from "@heroicons/vue/24/outline";
import { PuzzlePieceIcon } from "@heroicons/vue/24/solid";

const props = defineProps<{
  href: string;
}>();
</script>

<template>
  <a
    :href="props.href"
    target="_blank"
    rel="noreferrer"
    aria-label="Browser extension: track time right from your browser (opens in a new tab)"
    class="focus-visible:outline-text-inverse flex items-center justify-between gap-2.5 rounded-sm border border-white/20 bg-white/10 px-3.5 py-3 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2"
    data-testid="login-extension-callout"
  >
    <span class="flex items-center gap-3">
      <span
        class="text-text-inverse flex size-8 shrink-0 items-center justify-center rounded-md bg-white/20"
      >
        <PuzzlePieceIcon class="size-4" />
      </span>
      <span class="flex flex-col gap-px">
        <span class="text-text-inverse text-sm font-semibold">
          Browser extension
        </span>
        <span class="text-text-inverse-muted text-xs">
          Track time right from your browser
        </span>
      </span>
    </span>
    <ArrowRightIcon class="text-text-inverse size-4 shrink-0" />
  </a>
</template>

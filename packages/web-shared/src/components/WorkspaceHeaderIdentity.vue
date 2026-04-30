<script setup lang="ts">
import Avatar from "primevue/avatar";

const props = defineProps<{
  counterpartHref: string;
  counterpartLabel: string;
  displayName: string;
  userInitials: string;
}>();
</script>

<template>
  <div class="flex items-center gap-3">
    <a
      :href="props.counterpartHref"
      class="hidden text-[13px] font-semibold text-brand transition hover:underline sm:block"
    >
      {{ props.counterpartLabel }}
    </a>
    <div class="hidden text-right sm:block">
      <p class="text-[13px] font-medium text-text-dark">
        {{ props.displayName }}
      </p>
    </div>
    <Avatar
      :label="props.userInitials"
      shape="circle"
      class="size-8"
      aria-label="Account profile"
      :pt="{
        root: 'bg-accent-tint text-[12px] font-semibold text-brand',
      }"
    />
  </div>
</template>

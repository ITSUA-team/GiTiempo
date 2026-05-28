<script setup lang="ts">
interface MobileRecordMetadataItem {
  label: string;
  value: string;
  fullWidth?: boolean;
}

defineProps<{
  items: MobileRecordMetadataItem[];
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div
      v-for="item in items"
      :key="item.label"
      class="flex flex-col gap-1"
      :class="item.fullWidth ? 'col-span-2' : undefined"
    >
      <span class="text-text-muted text-xs">{{ item.label }}</span>
      <span class="text-text-dark text-[13px] font-semibold">
        {{ item.value }}
      </span>
    </div>
  </div>
</template>

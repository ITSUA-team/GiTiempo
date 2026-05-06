<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps<{
    visibility: 'public' | 'private';
    isActive?: boolean;
}>();

const rootClass = computed(() => {
    if (props.isActive === false) {
        return 'bg-app-bg text-text-muted rounded-sm px-2 py-1 text-xs font-semibold';
    }
    return props.visibility === 'public'
        ? 'bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold'
        : 'bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold';
});
</script>

<template>
  <Tag
    :value="visibility === 'public' ? 'Public' : 'Private'"
    :pt="{ root: rootClass }"
  />
</template>

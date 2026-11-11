<script setup lang="ts">
import { ref } from 'vue';
import Menu from 'primevue/menu';
import Button from 'primevue/button';

defineProps<{ reference: string; mobile?: boolean }>();
const emit = defineEmits<{ open: []; move: [] }>();
const menu = ref<InstanceType<typeof Menu>>();
const items = [
  { label: 'Open invoice', icon: 'pi pi-file', command: () => emit('open') },
  { label: 'Move to group', icon: 'pi pi-folder-open', command: () => emit('move') },
];
</script>

<template>
  <Button
    type="button"
    :aria-label="`Actions for ${reference}`"
    aria-haspopup="menu"
    icon="pi pi-ellipsis-h"
    severity="secondary"
    :variant="mobile ? 'outlined' : 'text'"
    size="small"
    :class="mobile ? 'size-[38px]' : 'size-8'"
    @click="menu?.toggle($event)"
  />
  <Menu
    ref="menu"
    :model="items"
    popup
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';

/**
 * Mobile bottom-sheet chrome, shared by the reports save/list sheets and any
 * future mobile surface: a full-width Dialog pinned to the bottom with a rounded
 * top, a grab handle, and the shared header spacing. Consumers provide a #title
 * and the body; per-sheet `pt` overrides (e.g. content padding) merge over the
 * base header spacing. Centralising the root overrides keeps the classes that
 * fight the centered-modal preset in one place instead of copied per sheet.
 */

const props = defineProps<{
  visible: boolean;
  /** Per-sheet PrimeVue passthrough, merged over the base header spacing. */
  pt?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
}>();

// A bottom sheet overrides the centered-modal preset: full width, no margin,
// square bottom, rounded top, no border.
const rootClass =
  '!relative !m-0 w-full !max-w-none !rounded-t-[16px] !rounded-b-none !border-0';

const mergedPt = computed(() => ({
  header: { class: '!pt-5 !pb-2' },
  ...(props.pt ?? {}),
}));

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :class="rootClass"
    modal
    :draggable="false"
    position="bottom"
    :pt="mergedPt"
    :visible="visible"
    @update:visible="close"
  >
    <template #header>
      <span
        aria-hidden="true"
        class="bg-divider absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full"
      />
      <span class="text-text-dark text-[18px] font-semibold">
        <slot name="title" />
      </span>
    </template>

    <slot />
  </Dialog>
</template>

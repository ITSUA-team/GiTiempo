<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SavedReport } from '@gitiempo/shared';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';

import { describeSavedReportConfig } from '@/lib/saved-report-config';

/**
 * The mobile preset manager from the "Saved Reports Sheet Mobile" design
 * frame: a bottom sheet listing every preset with tap-to-apply, a per-row
 * overflow for rename/delete, and a New report action. Only opened from the
 * bar's mobile layout; desktop manages presets through the pill row.
 */

defineProps<{
  visible: boolean;
  activeId: string | null;
  presets: SavedReport[];
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  delete: [id: string];
  new: [];
  rename: [id: string];
  select: [id: string];
}>();

const overflowMenu = ref<InstanceType<typeof Menu> | null>(null);
const overflowTargetId = ref<string | null>(null);

const overflowItems = computed(() => [
  {
    command: () => {
      if (overflowTargetId.value !== null) {
        emit('rename', overflowTargetId.value);
      }
    },
    icon: 'pi pi-pencil',
    label: 'Rename',
  },
  {
    command: () => {
      if (overflowTargetId.value !== null) {
        emit('delete', overflowTargetId.value);
      }
    },
    icon: 'pi pi-trash',
    label: 'Delete',
  },
]);

function metaLine(preset: SavedReport): string {
  return describeSavedReportConfig(preset.config)
    .slice(0, 2)
    .map((item) => item.label)
    .join(' · ');
}

function close(): void {
  emit('update:visible', false);
}

function selectPreset(id: string): void {
  emit('select', id);
  close();
}

function startNew(): void {
  emit('new');
  close();
}

function toggleOverflow(event: Event, id: string): void {
  overflowTargetId.value = id;
  overflowMenu.value?.toggle(event);
}
</script>

<template>
  <Dialog
    class="!m-0 w-full !max-w-none !rounded-b-none !rounded-t-2xl"
    header="Saved reports"
    modal
    :draggable="false"
    position="bottom"
    :visible="visible"
    @update:visible="close"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="flex h-[56px] items-center justify-between gap-2 rounded-lg px-3"
          :class="preset.id === activeId ? 'bg-accent-tint' : ''"
          :data-testid="`saved-sheet-row-${preset.id}`"
        >
          <button
            class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            type="button"
            @click="selectPreset(preset.id)"
          >
            <i
              aria-hidden="true"
              class="pi pi-bookmark shrink-0 text-[14px]"
              :class="preset.id === activeId ? 'text-brand' : 'text-text-muted'"
            />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-text-dark truncate text-[14px] font-semibold">
                {{ preset.name }}
              </span>
              <span class="text-text-muted truncate text-[12px]">
                {{ metaLine(preset) }}
              </span>
            </span>
          </button>

          <i
            v-if="preset.id === activeId"
            aria-hidden="true"
            class="pi pi-check text-brand text-[16px]"
            data-testid="saved-sheet-active-check"
          />
          <button
            :aria-label="`Options for ${preset.name}`"
            class="text-text-muted flex size-[36px] shrink-0 items-center justify-center"
            :data-testid="`saved-sheet-overflow-${preset.id}`"
            type="button"
            @click="toggleOverflow($event, preset.id)"
          >
            <i
              aria-hidden="true"
              class="pi pi-ellipsis-v text-[14px]"
            />
          </button>
        </div>
      </div>

      <div class="bg-divider h-px w-full" />

      <button
        class="text-brand flex h-[48px] items-center gap-2.5 px-3 text-[14px] font-semibold"
        data-testid="saved-sheet-new"
        type="button"
        @click="startNew"
      >
        <i
          aria-hidden="true"
          class="pi pi-plus text-[14px]"
        />
        New report
      </button>

      <p class="text-text-muted px-3 text-[12px]">
        Tap a report to apply it · ⋯ to rename or delete
      </p>
    </div>

    <Menu
      ref="overflowMenu"
      :model="overflowItems"
      :popup="true"
    />
  </Dialog>
</template>

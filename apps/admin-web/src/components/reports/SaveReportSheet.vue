<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

import type { SavedReportConfigSummaryItem } from '@/lib/saved-report-config';

/**
 * The mobile save flow from the "Save Report Sheet Mobile" design frame: a
 * bottom sheet choosing between updating the loaded preset and saving a new
 * one, with a summary of what the preset captures. Desktop keeps the plain
 * name dialog in SavedReportsBar — this sheet is only opened from the bar's
 * mobile layout.
 */

const props = defineProps<{
  visible: boolean;
  /** Name of the loaded preset, or null when nothing is loaded. */
  activeName: string | null;
  /** Whether updating the loaded preset would change anything. */
  canUpdate: boolean;
  isSaving: boolean;
  summary: SavedReportConfigSummaryItem[];
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  save: [];
  saveAsNew: [name: string];
}>();

const mode = ref<'update' | 'new'>('new');
const nameDraft = ref('');

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;

    mode.value = props.canUpdate ? 'update' : 'new';
    nameDraft.value = '';
  },
);

const canConfirm = computed(() =>
  mode.value === 'update'
    ? props.canUpdate
    : nameDraft.value.trim().length > 0,
);

function close(): void {
  emit('update:visible', false);
}

function confirm(): void {
  if (!canConfirm.value || props.isSaving) return;

  if (mode.value === 'update') {
    emit('save');
  } else {
    emit('saveAsNew', nameDraft.value.trim());
  }

  close();
}

function optionClass(selected: boolean, disabled: boolean): string {
  if (disabled) return 'border-divider opacity-50';

  return selected
    ? 'border-brand bg-accent-tint'
    : 'border-divider bg-surface-primary';
}
</script>

<template>
  <Dialog
    class="!m-0 w-full !max-w-none !rounded-b-none !rounded-t-2xl"
    header="Save report"
    modal
    :draggable="false"
    position="bottom"
    :visible="visible"
    @update:visible="close"
  >
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-col gap-2.5"
        role="radiogroup"
        aria-label="How to save this report"
      >
        <button
          v-if="activeName !== null"
          :aria-checked="mode === 'update'"
          class="flex items-center gap-2.5 rounded-lg border p-3 text-left"
          :class="optionClass(mode === 'update', !canUpdate)"
          data-testid="save-sheet-option-update"
          :disabled="!canUpdate"
          role="radio"
          type="button"
          @click="mode = 'update'"
        >
          <span
            class="flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]"
            :class="mode === 'update' ? 'border-brand' : 'border-divider'"
          >
            <span
              v-if="mode === 'update'"
              class="bg-brand size-2 rounded-full"
            />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-text-dark text-[14px] font-semibold">
              Update “{{ activeName }}”
            </span>
            <span class="text-text-muted text-[12px]">
              {{
                canUpdate
                  ? 'Overwrites its date range, grouping, and filters'
                  : 'No changes to save'
              }}
            </span>
          </span>
        </button>

        <button
          :aria-checked="mode === 'new'"
          class="flex items-center gap-2.5 rounded-lg border p-3 text-left"
          :class="optionClass(mode === 'new', false)"
          data-testid="save-sheet-option-new"
          role="radio"
          type="button"
          @click="mode = 'new'"
        >
          <span
            class="flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]"
            :class="mode === 'new' ? 'border-brand' : 'border-divider'"
          >
            <span
              v-if="mode === 'new'"
              class="bg-brand size-2 rounded-full"
            />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-text-dark text-[14px] font-semibold">
              Save as new report
            </span>
            <span class="text-text-muted text-[12px]">
              {{
                activeName !== null
                  ? `Keeps “${activeName}” unchanged`
                  : 'Available to every admin in this workspace'
              }}
            </span>
          </span>
        </button>
      </div>

      <div
        v-if="mode === 'new'"
        class="flex flex-col gap-1.5"
      >
        <label
          class="text-text-dark text-[13px] font-semibold"
          for="save-sheet-name"
        >
          Report name
        </label>
        <InputText
          id="save-sheet-name"
          v-model="nameDraft"
          class="w-full"
          data-testid="save-sheet-name-input"
          placeholder="Monthly billing"
          @keyup.enter="confirm"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-text-dark text-[13px] font-semibold">
          This report saves
        </span>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="item in summary"
            :key="item.label"
            class="bg-app-bg text-text-muted flex h-[28px] items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] font-medium"
          >
            <i
              :class="[item.icon, 'text-[12px]']"
              aria-hidden="true"
            />
            {{ item.label }}
          </span>
        </div>
      </div>

      <p class="text-text-muted flex items-center gap-1.5 text-[12px]">
        <i
          class="pi pi-info-circle text-[13px]"
          aria-hidden="true"
        />
        Results are not stored — the report reruns on open.
      </p>

      <div class="flex flex-col gap-1">
        <Button
          class="h-[44px] w-full"
          data-testid="save-sheet-confirm"
          :disabled="!canConfirm || isSaving"
          label="Save report"
          :loading="isSaving"
          @click="confirm"
        />
        <Button
          class="w-full"
          label="Cancel"
          severity="secondary"
          text
          @click="close"
        />
      </div>
    </div>
  </Dialog>
</template>

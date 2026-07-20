<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SavedReport } from '@gitiempo/shared';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';

/**
 * The saved reports bar from the approved "Admin Reports V2" design frame
 * (node `savedReportsBar`): preset pills with the loaded one tinted and
 * bookmark-marked, a `New report` pill, and on the right an unsaved-changes
 * indicator, `Save`, and `Save as new…`.
 *
 * Rename and delete are not in the frame. They ship as an overflow menu on the
 * active pill because a create-only preset list is a one-way door — recorded
 * as a deliberate addition to the approved design.
 */

const props = defineProps<{
  activeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  presets: SavedReport[];
}>();

const emit = defineEmits<{
  delete: [id: string];
  new: [];
  rename: [id: string, name: string];
  save: [];
  saveAsNew: [name: string];
  select: [id: string];
}>();

const nameDialogMode = ref<'create' | 'rename' | null>(null);
const nameDraft = ref('');
const overflowMenu = ref<InstanceType<typeof Menu> | null>(null);

const activePreset = computed(
  () => props.presets.find((preset) => preset.id === props.activeId) ?? null,
);

const canSave = computed(() => props.activeId !== null && props.isDirty);

const isNameValid = computed(() => nameDraft.value.trim().length > 0);

const dialogHeader = computed(() =>
  nameDialogMode.value === 'rename' ? 'Rename report' : 'Save report as new',
);

const overflowItems = computed(() => [
  { command: () => openRenameDialog(), icon: 'pi pi-pencil', label: 'Rename' },
  {
    command: () => {
      if (props.activeId !== null) emit('delete', props.activeId);
    },
    icon: 'pi pi-trash',
    label: 'Delete',
  },
]);

function openCreateDialog(): void {
  nameDraft.value = '';
  nameDialogMode.value = 'create';
}

function openRenameDialog(): void {
  nameDraft.value = activePreset.value?.name ?? '';
  nameDialogMode.value = 'rename';
}

function closeDialog(): void {
  nameDialogMode.value = null;
}

function confirmDialog(): void {
  if (!isNameValid.value) return;

  const name = nameDraft.value.trim();
  if (nameDialogMode.value === 'rename') {
    if (props.activeId !== null) emit('rename', props.activeId, name);
  } else {
    emit('saveAsNew', name);
  }

  closeDialog();
}

function toggleOverflow(event: Event): void {
  overflowMenu.value?.toggle(event);
}

function pillClass(isActive: boolean): string {
  return isActive
    ? 'bg-accent-tint text-brand font-semibold'
    : 'bg-surface-primary text-text-muted border border-divider font-medium';
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-testid="saved-reports-bar"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-text-muted text-[13px] font-medium">
          Saved reports
        </span>

        <button
          v-for="preset in presets"
          :key="preset.id"
          class="flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[13px]"
          :class="pillClass(preset.id === activeId)"
          :data-testid="`saved-report-tab-${preset.id}`"
          type="button"
          @click="emit('select', preset.id)"
        >
          <i
            v-if="preset.id === activeId"
            class="pi pi-bookmark text-[12px]"
            aria-hidden="true"
          />
          {{ preset.name }}
        </button>

        <button
          v-if="activePreset"
          aria-label="Report options"
          class="border-divider bg-surface-primary text-text-muted flex h-[32px] w-[32px] items-center justify-center rounded-full border"
          data-testid="saved-report-overflow"
          type="button"
          @click="toggleOverflow"
        >
          <i
            class="pi pi-ellipsis-h text-[12px]"
            aria-hidden="true"
          />
        </button>
        <Menu
          ref="overflowMenu"
          :model="overflowItems"
          :popup="true"
        />

        <button
          class="border-divider bg-surface-primary text-text-muted flex h-[32px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
          data-testid="saved-report-new"
          type="button"
          @click="emit('new')"
        >
          <i
            class="pi pi-plus text-[12px]"
            aria-hidden="true"
          />
          New report
        </button>
      </div>

      <div class="flex items-center gap-3">
        <span
          v-if="isDirty"
          class="text-text-muted flex items-center gap-1.5 text-[12px]"
          data-testid="saved-report-dirty"
        >
          <span class="bg-status-warn-text size-[7px] rounded-full" />
          Unsaved changes
        </span>

        <Button
          class="bg-accent-tint text-brand h-[32px] gap-1.5 rounded-[6px] px-3 text-[13px] font-semibold"
          data-testid="saved-report-save"
          :disabled="!canSave || isSaving"
          :loading="isSaving"
          text
          @click="emit('save')"
        >
          <i
            class="pi pi-save text-[12px]"
            aria-hidden="true"
          />
          Save
        </Button>

        <Button
          class="h-[32px] text-[13px]"
          data-testid="saved-report-save-as"
          label="Save as new…"
          outlined
          severity="secondary"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <p
      v-if="error"
      class="text-destructive text-[12px]"
      data-testid="saved-report-error"
      role="alert"
    >
      {{ error }}
    </p>

    <Dialog
      :header="dialogHeader"
      modal
      :style="{ width: '380px' }"
      :visible="nameDialogMode !== null"
      @update:visible="closeDialog"
    >
      <label
        class="text-text-muted mb-2 block text-[13px]"
        for="saved-report-name"
      >
        Report name
      </label>
      <InputText
        id="saved-report-name"
        v-model="nameDraft"
        autofocus
        class="w-full"
        data-testid="saved-report-name-input"
        placeholder="Monthly billing"
        @keyup.enter="confirmDialog"
      />

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          variant="outlined"
          @click="closeDialog"
        />
        <Button
          data-testid="saved-report-name-confirm"
          :disabled="!isNameValid"
          label="Save"
          @click="confirmDialog"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SavedReport } from '@gitiempo/shared';
import { useIsMobileViewport } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';

import SavedReportsListSheet from '@/components/reports/SavedReportsListSheet.vue';
import SaveReportSheet from '@/components/reports/SaveReportSheet.vue';
import type { SavedReportConfigSummaryItem } from '@/lib/saved-report-config';

/**
 * The saved reports bar from the approved "Admin Reports V2" design frame
 * (node `savedReportsBar`): preset pills with the loaded one tinted and
 * bookmark-marked, a `New report` pill, and on the right an unsaved-changes
 * indicator, `Save`, and `Save as new…`.
 *
 * Rename and delete are not in the frame. They ship as an overflow menu on the
 * active pill because a create-only preset list is a one-way door — recorded
 * as a deliberate addition to the approved design.
 *
 * On mobile the bar follows the "Admin Reports Mobile" frames instead: a
 * horizontally scrollable pill strip with fixed manage/new buttons, the dirty
 * row beneath it, and bottom sheets for saving and managing presets.
 */

const props = defineProps<{
  activeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  presets: SavedReport[];
  /** What the current setup captures; shown in the mobile save sheet. */
  summary?: SavedReportConfigSummaryItem[];
}>();

const emit = defineEmits<{
  delete: [id: string];
  new: [];
  rename: [id: string, name: string];
  save: [];
  saveAsNew: [name: string];
  select: [id: string];
}>();

const isMobileViewport = useIsMobileViewport();

const nameDialogMode = ref<'create' | 'rename' | null>(null);
const nameDraft = ref('');
const renameTargetId = ref<string | null>(null);
const overflowMenu = ref<InstanceType<typeof Menu> | null>(null);
const saveSheetOpen = ref(false);
const manageSheetOpen = ref(false);

const activePreset = computed(
  () => props.presets.find((preset) => preset.id === props.activeId) ?? null,
);

const canSave = computed(() => props.activeId !== null && props.isDirty);

const isNameValid = computed(() => nameDraft.value.trim().length > 0);

const dialogHeader = computed(() =>
  nameDialogMode.value === 'rename' ? 'Rename report' : 'Save report as new',
);

const overflowItems = computed(() => [
  {
    command: () => openRenameDialog(props.activeId),
    icon: 'pi pi-pencil',
    label: 'Rename',
  },
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

function openRenameDialog(id: string | null): void {
  const target = props.presets.find((preset) => preset.id === id) ?? null;
  if (target === null) return;

  renameTargetId.value = target.id;
  nameDraft.value = target.name;
  nameDialogMode.value = 'rename';
}

function closeDialog(): void {
  nameDialogMode.value = null;
}

function confirmDialog(): void {
  if (!isNameValid.value) return;

  const name = nameDraft.value.trim();
  if (nameDialogMode.value === 'rename') {
    if (renameTargetId.value !== null) {
      emit('rename', renameTargetId.value, name);
    }
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
    <template v-if="isMobileViewport">
      <div class="flex items-center gap-2">
        <div
          class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
          data-testid="saved-reports-strip"
        >
          <button
            v-for="preset in presets"
            :key="preset.id"
            class="flex h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px]"
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
        </div>

        <button
          v-if="presets.length > 0"
          aria-label="Manage saved reports"
          class="border-divider bg-surface-primary text-text-muted flex size-[32px] shrink-0 items-center justify-center rounded-full border"
          data-testid="saved-reports-manage"
          type="button"
          @click="manageSheetOpen = true"
        >
          <i
            class="pi pi-ellipsis-h text-[12px]"
            aria-hidden="true"
          />
        </button>
        <button
          aria-label="New report"
          class="border-divider bg-surface-primary text-text-muted flex size-[32px] shrink-0 items-center justify-center rounded-full border"
          data-testid="saved-report-new"
          type="button"
          @click="emit('new')"
        >
          <i
            class="pi pi-plus text-[12px]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span
          v-if="isDirty"
          class="text-text-muted flex items-center gap-1.5 text-[12px]"
          data-testid="saved-report-dirty"
        >
          <span class="bg-status-warn-text size-[7px] rounded-full" />
          Unsaved changes
        </span>
        <span v-else />

        <div class="flex items-center gap-2">
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
            label="Save as…"
            outlined
            severity="secondary"
            @click="saveSheetOpen = true"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="flex flex-wrap items-center justify-between gap-3"
    >
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

    <SaveReportSheet
      v-model:visible="saveSheetOpen"
      :active-name="activePreset?.name ?? null"
      :can-update="canSave"
      :is-saving="isSaving"
      :summary="summary ?? []"
      @save="emit('save')"
      @save-as-new="(name) => emit('saveAsNew', name)"
    />

    <SavedReportsListSheet
      v-model:visible="manageSheetOpen"
      :active-id="activeId"
      :presets="presets"
      @delete="(id) => emit('delete', id)"
      @new="emit('new')"
      @rename="openRenameDialog"
      @select="(id) => emit('select', id)"
    />
  </div>
</template>

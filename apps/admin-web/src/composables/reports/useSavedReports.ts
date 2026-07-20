import { computed, ref, shallowRef, type ComputedRef } from 'vue';
import type { SavedReport, SavedReportConfig } from '@gitiempo/shared';

import {
  getAdminSavedReportsClient,
  type AdminSavedReportsClient,
} from '@/services/admin-saved-reports-client';
import {
  applyConfigToState,
  isSameSavedReportConfig,
  type AppliedConfig,
  type ApplyConfigOptions,
} from '@/lib/saved-report-config';

interface UseSavedReportsOptions {
  client?: AdminSavedReportsClient;
  /** The config describing what the page currently shows. */
  currentConfig: ComputedRef<SavedReportConfig>;
  /** Applies a restored preset onto the page state. */
  onApply: (applied: AppliedConfig) => void;
  /** Option scope used to drop identities the viewer can no longer choose. */
  resolveOptions?: () => ApplyConfigOptions;
}

/**
 * Owns the preset list and which preset is loaded.
 *
 * Dirty state compares the current config against the config as it was
 * loaded — the stored shape, not the resolved date window — so a relative
 * preset does not read as changed simply because time passed.
 */
export function useSavedReports({
  client = getAdminSavedReportsClient(),
  currentConfig,
  onApply,
  resolveOptions,
}: UseSavedReportsOptions) {
  const presets = shallowRef<SavedReport[]>([]);
  const activeId = ref<string | null>(null);
  const loadedConfig = shallowRef<SavedReportConfig | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);

  const activePreset = computed(
    () => presets.value.find((preset) => preset.id === activeId.value) ?? null,
  );

  const isDirty = computed(() => {
    if (loadedConfig.value === null) return false;

    return !isSameSavedReportConfig(loadedConfig.value, currentConfig.value);
  });

  const canSave = computed(() => activeId.value !== null && isDirty.value);

  async function refresh(): Promise<void> {
    isLoading.value = true;
    try {
      presets.value = await client.listSavedReports();
      // The loaded preset may have been deleted by someone else.
      if (activeId.value !== null && activePreset.value === null) {
        clearActive();
      }
    } finally {
      isLoading.value = false;
    }
  }

  function applyPreset(preset: SavedReport): void {
    const applied = applyConfigToState(preset.config, resolveOptions?.() ?? {});

    activeId.value = preset.id;
    loadedConfig.value = preset.config;
    onApply(applied);
  }

  function selectPreset(id: string): void {
    const preset = presets.value.find((candidate) => candidate.id === id);
    if (preset) applyPreset(preset);
  }

  /** Drops the active preset without touching page state. */
  function clearActive(): void {
    activeId.value = null;
    loadedConfig.value = null;
  }

  async function withSave<T>(action: () => Promise<T>): Promise<T | null> {
    isSaving.value = true;
    error.value = null;
    try {
      return await action();
    } catch (caught) {
      error.value = toMessage(caught);
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  /** Overwrites the loaded preset with what the page currently shows. */
  function save(): Promise<SavedReport | null> {
    const id = activeId.value;
    if (id === null) return Promise.resolve(null);

    return withSave(async () => {
      const saved = await client.updateSavedReport(id, {
        config: currentConfig.value,
      });
      // Refresh before adopting the result: refresh() drops an active id that
      // is missing from the list, which would undo the activation below.
      await refresh();
      activeId.value = saved.id;
      loadedConfig.value = saved.config;
      return saved;
    });
  }

  function saveAsNew(name: string): Promise<SavedReport | null> {
    return withSave(async () => {
      const created = await client.createSavedReport({
        config: currentConfig.value,
        name,
      });
      await refresh();
      activeId.value = created.id;
      loadedConfig.value = created.config;
      return created;
    });
  }

  function rename(id: string, name: string): Promise<SavedReport | null> {
    return withSave(async () => {
      const renamed = await client.updateSavedReport(id, { name });
      await refresh();
      return renamed;
    });
  }

  function remove(id: string): Promise<boolean | null> {
    return withSave(async () => {
      await client.deleteSavedReport(id);
      if (activeId.value === id) clearActive();
      await refresh();
      return true;
    });
  }

  return {
    activeId,
    activePreset,
    canSave,
    clearActive,
    error,
    isDirty,
    isLoading,
    isSaving,
    presets,
    refresh,
    remove,
    rename,
    save,
    saveAsNew,
    selectPreset,
  };
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  return 'Could not save the report. Try again.';
}

export type SavedReportsState = ReturnType<typeof useSavedReports>;

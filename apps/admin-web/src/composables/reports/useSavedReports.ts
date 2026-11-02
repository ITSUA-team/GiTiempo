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
 * Dirty state compares the current config with the stored preset shape.
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
  let collectionVersion = 0;
  let latestRefreshId = 0;

  const activePreset = computed(
    () => presets.value.find((preset) => preset.id === activeId.value) ?? null,
  );

  const isDirty = computed(() => {
    if (loadedConfig.value === null) return false;

    return !isSameSavedReportConfig(loadedConfig.value, currentConfig.value);
  });

  const canSave = computed(() => activeId.value !== null && isDirty.value);

  /**
   * Never rejects: presets are supplementary to the report, so a failed list
   * surfaces as a message in the bar rather than taking the page down.
   */
  async function refresh(): Promise<void> {
    const refreshId = ++latestRefreshId;
    const versionAtStart = collectionVersion;
    isLoading.value = true;
    try {
      const listedPresets = await client.listSavedReports();
      if (refreshId !== latestRefreshId || versionAtStart !== collectionVersion) {
        return;
      }

      presets.value = listedPresets;
      // The loaded preset may have been deleted by someone else.
      if (activeId.value !== null && activePreset.value === null) {
        clearActive();
      }
    } catch (caught) {
      if (refreshId === latestRefreshId && versionAtStart === collectionVersion) {
        error.value = toMessage(caught);
      }
    } finally {
      if (refreshId === latestRefreshId) {
        isLoading.value = false;
      }
    }
  }

  function applyPreset(preset: SavedReport, config: SavedReportConfig): void {
    const applied = applyConfigToState(config, resolveOptions?.() ?? {});

    activeId.value = preset.id;
    loadedConfig.value = config;
    onApply(applied);
  }

  function selectPreset(id: string): void {
    const preset = presets.value.find((candidate) => candidate.id === id);
    if (!preset) return;

    // A preset whose stored config could not be loaded is listed as
    // unavailable; it cannot be opened, so tell the user to recreate it rather
    // than silently doing nothing.
    if (preset.config === null) {
      error.value =
        'This saved report could not be loaded. Delete it and save a new one.';
      return;
    }

    applyPreset(preset, preset.config);
  }

  /** Drops the active preset without touching page state. */
  function clearActive(): void {
    activeId.value = null;
    loadedConfig.value = null;
  }

  function upsertPreset(preset: SavedReport): void {
    const index = presets.value.findIndex((candidate) => candidate.id === preset.id);

    if (index === -1) {
      presets.value = [preset, ...presets.value];
      return;
    }

    presets.value = presets.value.map((candidate, candidateIndex) =>
      candidateIndex === index ? preset : candidate,
    );
  }

  function recordLocalWrite(): void {
    collectionVersion += 1;
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
      recordLocalWrite();
      upsertPreset(saved);
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
      recordLocalWrite();
      upsertPreset(created);
      activeId.value = created.id;
      loadedConfig.value = created.config;
      return created;
    });
  }

  function rename(id: string, name: string): Promise<SavedReport | null> {
    return withSave(async () => {
      const renamed = await client.updateSavedReport(id, { name });
      recordLocalWrite();
      upsertPreset(renamed);
      return renamed;
    });
  }

  function remove(id: string): Promise<boolean | null> {
    return withSave(async () => {
      await client.deleteSavedReport(id);
      recordLocalWrite();
      presets.value = presets.value.filter((preset) => preset.id !== id);
      if (activeId.value === id) clearActive();
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

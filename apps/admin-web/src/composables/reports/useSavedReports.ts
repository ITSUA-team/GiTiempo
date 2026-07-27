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
  /**
   * The config describing what the page currently shows, or null when the
   * current state cannot be a valid preset (e.g. an incomplete date range).
   */
  currentConfig: ComputedRef<SavedReportConfig | null>;
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

  const activePreset = computed(
    () => presets.value.find((preset) => preset.id === activeId.value) ?? null,
  );

  const isDirty = computed(() => {
    const current = currentConfig.value;
    // An unbuildable state (null) is not a savable change, so it reads as clean
    // rather than a dirty preset that Save could never persist.
    if (loadedConfig.value === null || current === null) return false;

    return !isSameSavedReportConfig(loadedConfig.value, current);
  });

  const canSave = computed(() => activeId.value !== null && isDirty.value);

  /**
   * Never rejects: presets are supplementary to the report, so a failed list
   * surfaces as a message in the bar rather than taking the page down — and
   * the mutation paths below await this without needing their own guard.
   */
  async function refresh(): Promise<void> {
    isLoading.value = true;
    try {
      presets.value = await client.listSavedReports();
      // The loaded preset may have been deleted by someone else.
      if (activeId.value !== null && activePreset.value === null) {
        clearActive();
      }
    } catch (caught) {
      error.value = toMessage(caught);
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

  /**
   * The current config, or a thrown error that withSave turns into the bar's
   * inline message — a preset must never be written from an unbuildable state.
   */
  function requireCurrentConfig(): SavedReportConfig {
    const config = currentConfig.value;
    if (config === null) {
      throw new Error(
        'This report can’t be saved as it is. Check the date range and filters.',
      );
    }

    return config;
  }

  /** Overwrites the loaded preset with what the page currently shows. */
  function save(): Promise<SavedReport | null> {
    const id = activeId.value;
    if (id === null) return Promise.resolve(null);

    return withSave(async () => {
      const config = requireCurrentConfig();
      const saved = await client.updateSavedReport(id, { config });
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
      const config = requireCurrentConfig();
      const created = await client.createSavedReport({ config, name });
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

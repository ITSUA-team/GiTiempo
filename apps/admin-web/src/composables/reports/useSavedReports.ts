import {
  computed,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import type { SavedReport, SavedReportConfig } from '@gitiempo/shared';

import {
  useCreateSavedReportMutation,
  useDeleteSavedReportMutation,
  useSavedReportsQuery,
  useUpdateSavedReportMutation,
} from '@/composables/query';
import type { AdminServerStateScope } from '@/lib/query-keys';
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
  /** Gates the preset list query, matching the other admin data composables. */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Server-state scope. Presets are keyed by it, so a workspace switch refetches
   * the right list instead of showing the previous workspace's presets.
   */
  scope: MaybeRefOrGetter<AdminServerStateScope>;
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
 * Owns which preset is loaded and whether the page diverges from it.
 *
 * The preset LIST is server state, so it runs through TanStack Query — scoped
 * keys and shared invalidation — like every other admin list. Only the
 * loaded-preset selection and its snapshot for dirty comparison stay as local
 * UI state.
 */
export function useSavedReports({
  client = getAdminSavedReportsClient(),
  currentConfig,
  enabled = true,
  onApply,
  resolveOptions,
  scope,
}: UseSavedReportsOptions) {
  const activeId = ref<string | null>(null);
  const loadedConfig = shallowRef<SavedReportConfig | null>(null);
  const isSaving = ref(false);
  const error = ref<string | null>(null);

  const listQuery = useSavedReportsQuery({ client, enabled, scope });
  const createMutation = useCreateSavedReportMutation({ client, scope });
  const updateMutation = useUpdateSavedReportMutation({ client, scope });
  const deleteMutation = useDeleteSavedReportMutation({ client, scope });

  const presets = computed<SavedReport[]>(() => listQuery.data.value ?? []);
  const isLoading = computed(() => listQuery.isFetching.value);

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

  // A failed list is supplementary to the report, so surface it in the bar
  // rather than letting the query error take the page down.
  watch(
    () => listQuery.error.value,
    (caught) => {
      if (caught) error.value = toMessage(caught);
    },
  );

  // A refetch may drop the loaded preset — deleted by someone else, or a
  // workspace switch re-keyed the query — so clear it instead of leaving a
  // phantom active tab. `remove` clears its own delete synchronously; this
  // covers the refetches it does not drive.
  watch(presets, (list) => {
    if (
      activeId.value !== null &&
      !list.some((preset) => preset.id === activeId.value)
    ) {
      clearActive();
    }
  });

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

  /**
   * Refetch the preset list — the bar's retry affordance after a failed load.
   * Drops the loaded preset here too so the check is deterministic for callers
   * that await it, not only through the refetch watcher.
   */
  async function refresh(): Promise<void> {
    error.value = null;
    const result = await listQuery.refetch();
    if (result.isError) {
      error.value = toMessage(result.error);
      return;
    }

    const list = result.data ?? [];
    if (
      activeId.value !== null &&
      !list.some((preset) => preset.id === activeId.value)
    ) {
      clearActive();
    }
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
      // The mutation invalidates the list on success, so the refetched preset is
      // present by the time we adopt it as the loaded config below.
      const saved = await updateMutation.mutateAsync({ id, input: { config } });
      activeId.value = saved.id;
      loadedConfig.value = saved.config;
      return saved;
    });
  }

  function saveAsNew(name: string): Promise<SavedReport | null> {
    return withSave(async () => {
      const config = requireCurrentConfig();
      const created = await createMutation.mutateAsync({ config, name });
      activeId.value = created.id;
      loadedConfig.value = created.config;
      return created;
    });
  }

  function rename(id: string, name: string): Promise<SavedReport | null> {
    return withSave(() => updateMutation.mutateAsync({ id, input: { name } }));
  }

  function remove(id: string): Promise<boolean | null> {
    return withSave(async () => {
      await deleteMutation.mutateAsync(id);
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

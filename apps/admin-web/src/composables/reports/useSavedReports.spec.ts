import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, ref, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { SavedReport, SavedReportConfig } from '@gitiempo/shared';

import { createTestQueryPlugin } from '@/test/query-client';
import { useSavedReports } from './useSavedReports';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

function makeConfig(
  overrides: Partial<SavedReportConfig> = {},
): SavedReportConfig {
  return {
    dateRange: {
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-15T00:00:00.000Z',
      kind: 'absolute',
    },
    filters: {
      activity: 'any',
      billable: 'any',
      billableShare: 'any',
      global: '',
      hours: 'any',
    },
    grouping: ['project'],
    memberId: null,
    projectId: null,
    ...overrides,
  };
}

function makePreset(overrides: Partial<SavedReport> = {}): SavedReport {
  return {
    config: makeConfig(),
    createdAt: '2026-07-01T10:00:00.000Z',
    createdBy: PROJECT_ID,
    id: 'preset-1',
    name: 'Monthly billing',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * `presets` is the mutable backing list. The create/delete/update mocks keep it
 * in sync the way the server would, so a mutation's invalidation-refetch sees
 * the change; tests may also mutate it directly to simulate an external change.
 */
function setup(presets: SavedReport[] = [makePreset()]) {
  const current = ref<SavedReportConfig | null>(makeConfig());
  const applied: unknown[] = [];

  const client = {
    createSavedReport: vi.fn(
      async (input: { config: SavedReportConfig; name: string }) => {
        const created = makePreset({
          config: input.config,
          id: 'preset-new',
          name: input.name,
        });
        presets.push(created);
        return created;
      },
    ),
    deleteSavedReport: vi.fn(async (id: string) => {
      const index = presets.findIndex((preset) => preset.id === id);
      if (index >= 0) presets.splice(index, 1);
    }),
    listSavedReports: vi.fn(async () => presets.map((preset) => ({ ...preset }))),
    updateSavedReport: vi.fn(
      async (
        id: string,
        input: { config?: SavedReportConfig; name?: string },
      ) => {
        const updated = makePreset({
          id,
          ...(input.config === undefined ? {} : { config: input.config }),
          ...(input.name === undefined ? {} : { name: input.name }),
        });
        const index = presets.findIndex((preset) => preset.id === id);
        if (index >= 0) presets[index] = updated;
        return updated;
      },
    ),
  };

  let saved!: ReturnType<typeof useSavedReports>;

  mount(
    defineComponent({
      setup() {
        saved = useSavedReports({
          client: client as never,
          currentConfig: computed(() => current.value),
          enabled: ref(true),
          onApply: (value) => applied.push(value),
          scope: shallowRef({
            role: 'admin',
            userId: 'user-1',
            workspaceId: 'workspace-1',
          }),
        });
        return () => null;
      },
    }),
    { global: { plugins: [createTestQueryPlugin()] } },
  );

  return { applied, client, current, presets, saved };
}

describe('useSavedReports listing', () => {
  it('loads presets for the workspace', async () => {
    const { saved } = setup();

    await flushPromises();

    expect(saved.presets.value).toHaveLength(1);
    expect(saved.isLoading.value).toBe(false);
  });

  it('applies a selected preset and marks it active', async () => {
    const { applied, saved } = setup();
    await flushPromises();

    saved.selectPreset('preset-1');

    expect(saved.activeId.value).toBe('preset-1');
    expect(saved.activePreset.value?.name).toBe('Monthly billing');
    expect(applied).toHaveLength(1);
  });

  it('ignores a selection that does not exist', async () => {
    const { applied, saved } = setup();
    await flushPromises();

    saved.selectPreset('missing');

    expect(saved.activeId.value).toBeNull();
    expect(applied).toHaveLength(0);
  });

  it('clears the active preset when it disappears from the list', async () => {
    const presets = [makePreset()];
    const { saved } = setup(presets);
    await flushPromises();
    saved.selectPreset('preset-1');

    // Simulate a delete by another user, then reload.
    presets.length = 0;
    await saved.refresh();

    expect(saved.activeId.value).toBeNull();
    expect(saved.isDirty.value).toBe(false);
  });
});

describe('useSavedReports dirty state', () => {
  it('is not dirty before a preset is loaded', async () => {
    const { saved } = setup();
    await flushPromises();

    expect(saved.isDirty.value).toBe(false);
    expect(saved.canSave.value).toBe(false);
  });

  it('is not dirty right after loading a preset', async () => {
    const { saved } = setup();
    await flushPromises();

    saved.selectPreset('preset-1');

    expect(saved.isDirty.value).toBe(false);
    expect(saved.canSave.value).toBe(false);
  });

  it('becomes dirty when the current config diverges', async () => {
    const { current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');

    current.value = makeConfig({ grouping: ['project', 'user'] });

    expect(saved.isDirty.value).toBe(true);
    expect(saved.canSave.value).toBe(true);
  });

  it('clears again when the change is reverted', async () => {
    const { current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');

    current.value = makeConfig({ grouping: ['project', 'user'] });
    current.value = makeConfig();

    expect(saved.isDirty.value).toBe(false);
  });

  it('becomes dirty when the date range changes', async () => {
    const { current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');

    current.value = makeConfig({
      dateRange: {
        dateFrom: '2026-07-02T00:00:00.000Z',
        dateTo: '2026-07-15T00:00:00.000Z',
        kind: 'absolute',
      },
    });

    expect(saved.isDirty.value).toBe(true);
  });

  it('reads as not dirty while the current state cannot be built', async () => {
    const { current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');

    current.value = null;

    expect(saved.isDirty.value).toBe(false);
    expect(saved.canSave.value).toBe(false);
  });
});

describe('useSavedReports mutations', () => {
  it('overwrites the loaded preset on save', async () => {
    const { client, current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');
    current.value = makeConfig({ grouping: ['user'] });

    await saved.save();

    expect(client.updateSavedReport).toHaveBeenCalledWith('preset-1', {
      config: current.value,
    });
    expect(saved.isDirty.value).toBe(false);
  });

  it('does nothing on save when no preset is loaded', async () => {
    const { client, saved } = setup();
    await flushPromises();

    const result = await saved.save();

    expect(result).toBeNull();
    expect(client.updateSavedReport).not.toHaveBeenCalled();
  });

  it('refuses to save an invalid current state and surfaces an error', async () => {
    const { client, current, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');
    current.value = null;

    const result = await saved.save();

    expect(result).toBeNull();
    expect(client.updateSavedReport).not.toHaveBeenCalled();
    expect(saved.error.value).toBeTruthy();
  });

  it('refuses to save-as-new from an invalid current state and surfaces an error', async () => {
    const { client, current, saved } = setup();
    await flushPromises();
    current.value = null;

    const result = await saved.saveAsNew('Anything');

    expect(result).toBeNull();
    expect(client.createSavedReport).not.toHaveBeenCalled();
    expect(saved.error.value).toBeTruthy();
  });

  it('creates and activates a preset on save as new', async () => {
    const { client, saved } = setup();
    await flushPromises();

    await saved.saveAsNew('Client hours');

    expect(client.createSavedReport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Client hours' }),
    );
    expect(saved.activeId.value).toBe('preset-new');
    expect(saved.isDirty.value).toBe(false);
  });

  it('surfaces a duplicate-name failure without activating anything', async () => {
    const { client, saved } = setup();
    await flushPromises();
    client.createSavedReport.mockRejectedValueOnce(
      new Error('A saved report named "Client hours" already exists'),
    );

    const result = await saved.saveAsNew('Client hours');

    expect(result).toBeNull();
    expect(saved.error.value).toContain('already exists');
    expect(saved.activeId.value).toBeNull();
  });

  it('clears a previous error on the next successful save', async () => {
    const { client, saved } = setup();
    await flushPromises();
    client.createSavedReport.mockRejectedValueOnce(new Error('nope'));
    await saved.saveAsNew('First');

    await saved.saveAsNew('Second');

    expect(saved.error.value).toBeNull();
  });

  it('renames through the client', async () => {
    const { client, saved } = setup();
    await flushPromises();

    await saved.rename('preset-1', 'Renamed');

    expect(client.updateSavedReport).toHaveBeenCalledWith('preset-1', {
      name: 'Renamed',
    });
  });

  it('clears the active preset when it is deleted', async () => {
    const { client, saved } = setup();
    await flushPromises();
    saved.selectPreset('preset-1');

    await saved.remove('preset-1');

    expect(client.deleteSavedReport).toHaveBeenCalledWith('preset-1');
    expect(saved.activeId.value).toBeNull();
  });

  it('keeps the active preset when a different one is deleted', async () => {
    const { saved } = setup([
      makePreset(),
      makePreset({ id: 'preset-2', name: 'Other' }),
    ]);
    await flushPromises();
    saved.selectPreset('preset-1');

    await saved.remove('preset-2');

    expect(saved.activeId.value).toBe('preset-1');
  });

  it('reports saving state while a mutation is in flight', async () => {
    const { client, saved } = setup();
    await flushPromises();
    let release: (() => void) | null = null;
    client.createSavedReport.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(makePreset({ id: 'preset-new' }));
        }),
    );

    const pending = saved.saveAsNew('Slow');
    // withSave flips isSaving synchronously; the mutation invokes the client on
    // a microtask, so let that run before releasing the deferred create.
    expect(saved.isSaving.value).toBe(true);
    await flushPromises();

    release!();
    await pending;
    expect(saved.isSaving.value).toBe(false);
  });
});

describe('useSavedReports failure handling', () => {
  it('surfaces a failed list without rejecting', async () => {
    const { client, saved } = setup();
    await flushPromises();
    client.listSavedReports.mockRejectedValueOnce(
      new Error('Your session has expired. Please sign in again.'),
    );

    await expect(saved.refresh()).resolves.toBeUndefined();
    expect(saved.error.value).toContain('session has expired');
    expect(saved.isLoading.value).toBe(false);
  });

  it('keeps the previously loaded presets when a refresh fails', async () => {
    const { client, saved } = setup();
    await flushPromises();
    client.listSavedReports.mockRejectedValueOnce(new Error('offline'));

    await saved.refresh();

    expect(saved.presets.value).toHaveLength(1);
  });
});

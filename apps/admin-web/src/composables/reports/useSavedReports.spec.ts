import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { SavedReport, SavedReportConfig } from '@gitiempo/shared';
import { useSavedReports } from './useSavedReports';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

function makeConfig(
  overrides: Partial<SavedReportConfig> = {},
): SavedReportConfig {
  return {
    dateRange: { kind: 'relative', period: 'this_month' },
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

function setup(presets: SavedReport[] = [makePreset()]) {
  const current = ref<SavedReportConfig>(makeConfig());
  const applied: unknown[] = [];

  const client = {
    createSavedReport: vi.fn(async ({ name }: { name: string }) =>
      makePreset({ id: 'preset-new', name }),
    ),
    deleteSavedReport: vi.fn(async () => undefined),
    listSavedReports: vi.fn(async () => presets),
    updateSavedReport: vi.fn(
      async (
        id: string,
        input: { config?: SavedReportConfig; name?: string },
      ) =>
        makePreset({
          id,
          ...(input.config === undefined ? {} : { config: input.config }),
          ...(input.name === undefined ? {} : { name: input.name }),
        }),
    ),
  };

  const saved = useSavedReports({
    client: client as never,
    currentConfig: computed(() => current.value),
    onApply: (value) => applied.push(value),
  });

  return { applied, client, current, saved };
}

describe('useSavedReports listing', () => {
  it('loads presets for the workspace', async () => {
    const { saved } = setup();

    await saved.refresh();

    expect(saved.presets.value).toHaveLength(1);
    expect(saved.isLoading.value).toBe(false);
  });

  it('applies a selected preset and marks it active', async () => {
    const { applied, saved } = setup();
    await saved.refresh();

    saved.selectPreset('preset-1');

    expect(saved.activeId.value).toBe('preset-1');
    expect(saved.activePreset.value?.name).toBe('Monthly billing');
    expect(applied).toHaveLength(1);
  });

  it('ignores a selection that does not exist', async () => {
    const { applied, saved } = setup();
    await saved.refresh();

    saved.selectPreset('missing');

    expect(saved.activeId.value).toBeNull();
    expect(applied).toHaveLength(0);
  });

  it('clears the active preset when it disappears from the list', async () => {
    const presets = [makePreset()];
    const { saved } = setup(presets);
    await saved.refresh();
    saved.selectPreset('preset-1');

    presets.length = 0;
    await saved.refresh();

    expect(saved.activeId.value).toBeNull();
    expect(saved.isDirty.value).toBe(false);
  });
});

describe('useSavedReports dirty state', () => {
  it('is not dirty before a preset is loaded', () => {
    const { saved } = setup();

    expect(saved.isDirty.value).toBe(false);
    expect(saved.canSave.value).toBe(false);
  });

  it('is not dirty right after loading a preset', async () => {
    const { saved } = setup();
    await saved.refresh();

    saved.selectPreset('preset-1');

    expect(saved.isDirty.value).toBe(false);
    expect(saved.canSave.value).toBe(false);
  });

  it('becomes dirty when the current config diverges', async () => {
    const { current, saved } = setup();
    await saved.refresh();
    saved.selectPreset('preset-1');

    current.value = makeConfig({ grouping: ['project', 'user'] });

    expect(saved.isDirty.value).toBe(true);
    expect(saved.canSave.value).toBe(true);
  });

  it('clears again when the change is reverted', async () => {
    const { current, saved } = setup();
    await saved.refresh();
    saved.selectPreset('preset-1');

    current.value = makeConfig({ grouping: ['project', 'user'] });
    current.value = makeConfig();

    expect(saved.isDirty.value).toBe(false);
  });

  it('stays clean when only the resolved window would differ', async () => {
    const { current, saved } = setup();
    await saved.refresh();
    saved.selectPreset('preset-1');

    // Same stored shape; a later day resolves to different concrete dates.
    current.value = makeConfig({
      dateRange: { kind: 'relative', period: 'this_month' },
    });

    expect(saved.isDirty.value).toBe(false);
  });
});

describe('useSavedReports mutations', () => {
  it('overwrites the loaded preset on save', async () => {
    const { client, current, saved } = setup();
    await saved.refresh();
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

    const result = await saved.save();

    expect(result).toBeNull();
    expect(client.updateSavedReport).not.toHaveBeenCalled();
  });

  it('creates and activates a preset on save as new', async () => {
    const { client, saved } = setup();

    await saved.saveAsNew('Client hours');

    expect(client.createSavedReport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Client hours' }),
    );
    expect(saved.activeId.value).toBe('preset-new');
    expect(saved.isDirty.value).toBe(false);
  });

  it('surfaces a duplicate-name failure without activating anything', async () => {
    const { client, saved } = setup();
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
    client.createSavedReport.mockRejectedValueOnce(new Error('nope'));
    await saved.saveAsNew('First');

    await saved.saveAsNew('Second');

    expect(saved.error.value).toBeNull();
  });

  it('renames through the client', async () => {
    const { client, saved } = setup();

    await saved.rename('preset-1', 'Renamed');

    expect(client.updateSavedReport).toHaveBeenCalledWith('preset-1', {
      name: 'Renamed',
    });
  });

  it('clears the active preset when it is deleted', async () => {
    const presets = [makePreset()];
    const { client, saved } = setup(presets);
    await saved.refresh();
    saved.selectPreset('preset-1');

    presets.length = 0;
    await saved.remove('preset-1');

    expect(client.deleteSavedReport).toHaveBeenCalledWith('preset-1');
    expect(saved.activeId.value).toBeNull();
  });

  it('keeps the active preset when a different one is deleted', async () => {
    const presets = [
      makePreset(),
      makePreset({ id: 'preset-2', name: 'Other' }),
    ];
    const { saved } = setup(presets);
    await saved.refresh();
    saved.selectPreset('preset-1');

    presets.splice(1, 1);
    await saved.remove('preset-2');

    expect(saved.activeId.value).toBe('preset-1');
  });

  it('reports saving state while a mutation is in flight', async () => {
    const { client, saved } = setup();
    let release: (() => void) | null = null;
    client.createSavedReport.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(makePreset({ id: 'preset-new' }));
        }),
    );

    const pending = saved.saveAsNew('Slow');
    expect(saved.isSaving.value).toBe(true);

    release!();
    await pending;
    expect(saved.isSaving.value).toBe(false);
  });
});

describe('useSavedReports failure handling', () => {
  it('surfaces a failed list without rejecting', async () => {
    const { client, saved } = setup();
    client.listSavedReports.mockRejectedValueOnce(
      new Error('Your session has expired. Please sign in again.'),
    );

    await expect(saved.refresh()).resolves.toBeUndefined();
    expect(saved.error.value).toContain('session has expired');
    expect(saved.isLoading.value).toBe(false);
  });

  it('keeps the previously loaded presets when a refresh fails', async () => {
    const { client, saved } = setup();
    await saved.refresh();
    client.listSavedReports.mockRejectedValueOnce(new Error('offline'));

    await saved.refresh();

    expect(saved.presets.value).toHaveLength(1);
  });
});

import { flushPromises, mount } from '@vue/test-utils';
import type { WorkspaceSettingsResponse } from '@gitiempo/shared';
import { computed, defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getWorkspaceSettings: vi.fn(),
}));

vi.mock('@/services/admin-settings-client', () => ({
  getAdminSettingsClient: () => ({
    getWorkspaceSettings: testMocks.getWorkspaceSettings,
  }),
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({ errorToast: testMocks.errorToast }),
}));

import { useWorkspaceRoundingSettings } from './useWorkspaceRoundingSettings';

function createWorkspaceSettingsFixture(
  overrides: Partial<WorkspaceSettingsResponse> = {},
): WorkspaceSettingsResponse {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    currency: 'USD',
    defaultHourlyRate: null,
    id: '77777777-7777-4777-8777-777777777777',
    timeRoundingStepMinutes: 5,
    timeZone: 'UTC',
    updatedAt: '2026-01-01T00:00:00.000Z',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

function composeWithSettings(
  options: { fallback: number | null; feature: string } = {
    fallback: 1,
    feature: 'projects',
  },
) {
  let result!: ReturnType<typeof useWorkspaceRoundingSettings>;

  const Harness = defineComponent({
    setup() {
      result = useWorkspaceRoundingSettings({
        enabled: true,
        fallback: options.fallback,
        feature: options.feature,
        scope: computed(() => ({ workspaceId: 'workspace-1' })),
      });
      return () => null;
    },
  });

  mount(Harness, { global: { plugins: [createTestQueryPlugin()] } });
  return result;
}

describe('useWorkspaceRoundingSettings', () => {
  beforeEach(() => {
    testMocks.errorToast.mockReset();
    testMocks.getWorkspaceSettings.mockReset();
    testMocks.getWorkspaceSettings.mockResolvedValue(
      createWorkspaceSettingsFixture(),
    );
  });

  it('serves the fallback while loading, then the loaded step', async () => {
    const settings = composeWithSettings({ fallback: 1, feature: 'projects' });

    expect(settings.workspaceRoundingStepMinutes.value).toBe(1);

    await flushPromises();

    expect(settings.workspaceRoundingStepMinutes.value).toBe(5);
  });

  it('keeps the nullable fallback for consumers that must not guess a step', async () => {
    const settings = composeWithSettings({ fallback: null, feature: 'invoices' });

    expect(settings.workspaceRoundingStepMinutes.value).toBeNull();

    await flushPromises();

    expect(settings.workspaceRoundingStepMinutes.value).toBe(5);
  });

  it('toasts the settings failure with the caller feature context', async () => {
    const settingsError = new Error('Settings unavailable');
    testMocks.getWorkspaceSettings.mockRejectedValueOnce(settingsError);

    composeWithSettings({ fallback: 1, feature: 'invoices' });
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledTimes(1);
    expect(testMocks.errorToast).toHaveBeenCalledWith('Settings unavailable', {
      error: settingsError,
      logContext: {
        action: 'load-workspace-settings',
        feature: 'invoices',
      },
    });
  });
});

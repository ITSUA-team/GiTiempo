import { describe, expect, it, vi } from 'vitest';
import { createAdminSavedReportsClient } from './admin-saved-reports-client';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

const config = {
  dateRange: {
    dateFrom: '2026-07-01T00:00:00.000Z',
    dateTo: '2026-07-15T00:00:00.000Z',
    kind: 'absolute' as const,
  },
  filters: {
    activity: 'any' as const,
    billable: 'any' as const,
    billableShare: 'any' as const,
    global: '',
    hours: 'any' as const,
  },
  grouping: ['project' as const],
  memberId: null,
  projectId: PROJECT_ID,
};

const preset = {
  config,
  createdAt: '2026-07-01T10:00:00.000Z',
  createdBy: PROJECT_ID,
  id: '00000000-0000-4000-8000-000000000010',
  name: 'Monthly billing',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

function createClient(response: unknown = preset) {
  const apiClient = {
    requestJson: vi.fn().mockResolvedValue(response),
    requestNoContent: vi.fn().mockResolvedValue(undefined),
  };

  return { apiClient, client: createAdminSavedReportsClient({ apiClient }) };
}

describe('adminSavedReportsClient', () => {
  it('lists presets from the saved reports endpoint', async () => {
    const { apiClient, client } = createClient([preset]);

    await client.listSavedReports();

    expect(apiClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/reports/saved' }),
    );
  });

  it('posts a validated create payload', async () => {
    const { apiClient, client } = createClient();

    await client.createSavedReport({ config, name: 'Monthly billing' });

    expect(apiClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { config, name: 'Monthly billing' },
        method: 'POST',
        path: '/reports/saved',
      }),
    );
  });

  it('rejects a create payload with an empty name before calling the API', () => {
    const { apiClient, client } = createClient();

    expect(() => client.createSavedReport({ config, name: '   ' })).toThrow();
    expect(apiClient.requestJson).not.toHaveBeenCalled();
  });

  it('patches a rename against the preset id', async () => {
    const { apiClient, client } = createClient();

    await client.updateSavedReport(preset.id, { name: 'Client hours' });

    expect(apiClient.requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: 'Client hours' },
        method: 'PATCH',
        path: `/reports/saved/${preset.id}`,
      }),
    );
  });

  it('rejects an empty update before calling the API', () => {
    const { apiClient, client } = createClient();

    expect(() => client.updateSavedReport(preset.id, {})).toThrow();
    expect(apiClient.requestJson).not.toHaveBeenCalled();
  });

  it('deletes through the no-content request', async () => {
    const { apiClient, client } = createClient();

    await client.deleteSavedReport(preset.id);

    expect(apiClient.requestNoContent).toHaveBeenCalledWith({
      method: 'DELETE',
      path: `/reports/saved/${preset.id}`,
    });
  });
});

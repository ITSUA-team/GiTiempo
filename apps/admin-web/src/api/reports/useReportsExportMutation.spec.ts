import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryPlugin } from '@/test/query-client';
import { useReportsExportMutation } from './useReportsExportMutation';

function mountExportMutation() {
  const reportsClient = {
    exportTimeReport: vi.fn().mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report.csv',
    }),
  };
  let api!: ReturnType<typeof useReportsExportMutation>;

  mount(
    defineComponent({
      setup() {
        api = useReportsExportMutation({
          reportsClient,
          token: () => 'access-token',
        });

        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin()],
      },
    },
  );

  return { api, reportsClient };
}

describe('useReportsExportMutation', () => {
  it('exports CSV through the existing reports client boundary', async () => {
    const { api, reportsClient } = mountExportMutation();

    await expect(api.exportReport({
      groupBy: 'user',
      projectId: 'project-1',
      userId: 'member-1',
    })).resolves.toEqual(expect.objectContaining({ filename: 'time-report.csv' }));
    expect(reportsClient.exportTimeReport).toHaveBeenCalledWith('access-token', {
      groupBy: 'user',
      projectId: 'project-1',
      userId: 'member-1',
    });
  });
});

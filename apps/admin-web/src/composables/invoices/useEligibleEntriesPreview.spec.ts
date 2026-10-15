import { defineComponent, ref, shallowRef, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type {
  EligibleEntriesQuery,
  EligibleEntriesResponse,
  InvoiceTimeEntrySummary,
} from '@gitiempo/shared';

import { createTestQueryPlugin } from '@/test/query-client';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useEligibleEntriesPreview } from './useEligibleEntriesPreview';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';
const timeEntryId = '55555555-5555-4555-8555-555555555555';
const taskId = '66666666-6666-4666-8666-666666666666';

function createScope() {
  return shallowRef({ role: 'admin', userId: 'user-1', workspaceId });
}

function createTimeEntry(
  overrides: Partial<InvoiceTimeEntrySummary> = {},
): InvoiceTimeEntrySummary {
  return {
    description: null,
    durationSeconds: 9000,
    endedAt: '2026-04-15T11:30:00.000Z',
    id: timeEntryId,
    isBillable: true,
    startedAt: '2026-04-15T09:00:00.000Z',
    taskId,
    taskName: 'Backend API',
    userId,
    userName: 'Alex Admin',
    ...overrides,
  };
}

function createEntriesResponse(
  overrides: Partial<EligibleEntriesResponse> = {},
): EligibleEntriesResponse {
  return {
    count: 1,
    defaultCurrency: 'USD',
    defaultHourlyRate: 80,
    entries: [createTimeEntry()],
    totalHours: 2.5,
    ...overrides,
  };
}

function mountEntriesPreview(
  options: {
    client: Pick<AdminInvoicesClient, 'listEligibleEntries'>;
    enabled?: Ref<boolean>;
    query?: Ref<EligibleEntriesQuery | null>;
  },
) {
  let data!: ReturnType<typeof useEligibleEntriesPreview>;

  mount(
    defineComponent({
      setup() {
        data = useEligibleEntriesPreview({
          client: options.client,
          enabled: options.enabled ?? ref(true),
          query: options.query ?? ref(null),
          scope: createScope(),
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

  return data;
}

describe('useEligibleEntriesPreview', () => {
  it('previews eligible entries once both date bounds are set', async () => {
    const entriesQuery: EligibleEntriesQuery = {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    };
    const query = ref<EligibleEntriesQuery | null>(entriesQuery);
    const listEligibleEntries = vi
      .fn()
      .mockResolvedValue(
        createEntriesResponse({
          count: 2,
          entries: [
            createTimeEntry(),
            createTimeEntry({ id: '55555555-5555-4555-8555-555555555556' }),
          ],
          totalHours: 5,
        }),
      );

    const data = mountEntriesPreview({
      client: { listEligibleEntries },
      query,
    });

    await flushPromises();

    expect(listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(listEligibleEntries).toHaveBeenCalledWith(entriesQuery);
    expect(data.preview.value).toEqual(
      createEntriesResponse({
        count: 2,
        entries: [
          createTimeEntry(),
          createTimeEntry({ id: '55555555-5555-4555-8555-555555555556' }),
        ],
        totalHours: 5,
      }),
    );
    expect(data.hasEntries.value).toBe(true);
    expect(data.isEmpty.value).toBe(false);
    expect(data.isLoading.value).toBe(false);
  });

  it('reports an empty preview when no entries match the range', async () => {
    const query = ref<EligibleEntriesQuery | null>({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
    const listEligibleEntries = vi.fn().mockResolvedValue(
      createEntriesResponse({
        count: 0,
        defaultCurrency: null,
        defaultHourlyRate: null,
        entries: [],
        totalHours: 0,
      }),
    );

    const data = mountEntriesPreview({
      client: { listEligibleEntries },
      query,
    });

    await flushPromises();

    expect(listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(data.isEmpty.value).toBe(true);
    expect(data.hasEntries.value).toBe(false);
    expect(data.isLoading.value).toBe(false);
  });

  it('does not fetch until the date bounds are provided, then fetches', async () => {
    const query = ref<EligibleEntriesQuery | null>(null);
    const listEligibleEntries = vi
      .fn()
      .mockResolvedValue(createEntriesResponse());

    const data = mountEntriesPreview({
      client: { listEligibleEntries },
      query,
    });

    await flushPromises();

    expect(listEligibleEntries).not.toHaveBeenCalled();
    expect(data.preview.value).toBeUndefined();
    expect(data.isEmpty.value).toBe(false);
    expect(data.hasEntries.value).toBe(false);

    query.value = {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId,
    };
    await flushPromises();

    expect(listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(listEligibleEntries).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId,
    });
    expect(data.preview.value).toEqual(createEntriesResponse());
    expect(data.hasEntries.value).toBe(true);
  });

  it('does not fetch while disabled even when date bounds are set', async () => {
    const query = ref<EligibleEntriesQuery | null>({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
    const listEligibleEntries = vi
      .fn()
      .mockResolvedValue(createEntriesResponse());

    const data = mountEntriesPreview({
      client: { listEligibleEntries },
      enabled: ref(false),
      query,
    });

    await flushPromises();

    expect(listEligibleEntries).not.toHaveBeenCalled();
    expect(data.preview.value).toBeUndefined();
    expect(data.isEmpty.value).toBe(false);
    expect(data.hasEntries.value).toBe(false);
  });
});
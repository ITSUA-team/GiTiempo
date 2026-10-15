import { defineComponent, nextTick, ref, shallowRef, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type {
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceStatsResponse,
} from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';

import { createTestQueryPlugin } from '@/test/query-client';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useInvoicesData } from './useInvoicesData';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';

function createScope() {
  return shallowRef({ role: 'admin', userId: 'user-1', workspaceId });
}

function createListResponse(items: InvoiceListResponse['items'] = []): InvoiceListResponse {
  return {
    items,
    meta: { limit: 20, page: 1, total: 2, totalPages: 1 },
  };
}

function createStatsResponse(): InvoiceStatsResponse {
  return {
    byStatus: { draft: 2, sent: 1, paid: 3 },
    thisMonth: {
      currency: 'USD',
      invoiceCount: 2,
      projectCount: 2,
      totalAmount: 2500,
    },
  };
}

type InvoicesDataClient = Pick<AdminInvoicesClient, 'getInvoiceStats' | 'listInvoices'>;

type InvoicesDataOptions = {
  client: InvoicesDataClient;
  enabled: Ref<boolean>;
  onError?: (message: string, error: unknown, action: string) => void;
  query?: Ref<Partial<InvoiceListQuery>>;
};

function mountInvoicesData(options: InvoicesDataOptions) {
  let data!: ReturnType<typeof useInvoicesData>;

  mount(
    defineComponent({
      setup() {
        data = useInvoicesData({ scope: createScope(), ...options });
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

describe('useInvoicesData', () => {
  it('loads invoices and stats once both requests settle', async () => {
    const listInvoices = vi.fn().mockResolvedValue(createListResponse());
    const getInvoiceStats = vi.fn().mockResolvedValue(createStatsResponse());

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await flushPromises();

    expect(listInvoices).toHaveBeenCalledTimes(1);
    expect(listInvoices).toHaveBeenCalledWith({});
    expect(getInvoiceStats).toHaveBeenCalledTimes(1);
    expect(data.invoices.value).toEqual(createListResponse());
    expect(data.stats.value).toEqual(createStatsResponse());
    expect(data.invoicesLoading.value).toBe(false);
    expect(data.statsLoading.value).toBe(false);
    expect(data.initialLoaded.value).toBe(true);
    expect(data.loadError.value).toBeNull();
  });

  it('keeps both datasets loading until their requests settle', async () => {
    let resolveInvoices!: (value: InvoiceListResponse) => void;
    let resolveStats!: (value: InvoiceStatsResponse) => void;
    const listInvoices = vi.fn(
      () =>
        new Promise<InvoiceListResponse>((resolve) => {
          resolveInvoices = resolve;
        }),
    );
    const getInvoiceStats = vi.fn(
      () =>
        new Promise<InvoiceStatsResponse>((resolve) => {
          resolveStats = resolve;
        }),
    );

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await nextTick();

    expect(data.invoicesLoading.value).toBe(true);
    expect(data.statsLoading.value).toBe(true);
    expect(data.initialLoaded.value).toBe(false);
    expect(data.invoices.value).toBeUndefined();
    expect(data.stats.value).toBeUndefined();

    resolveInvoices(createListResponse());
    resolveStats(createStatsResponse());
    await flushPromises();

    expect(data.invoicesLoading.value).toBe(false);
    expect(data.statsLoading.value).toBe(false);
    expect(data.initialLoaded.value).toBe(true);
  });

  it('does not fetch anything while disabled', async () => {
    const listInvoices = vi.fn().mockResolvedValue(createListResponse());
    const getInvoiceStats = vi.fn().mockResolvedValue(createStatsResponse());

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(false),
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await flushPromises();

    expect(listInvoices).not.toHaveBeenCalled();
    expect(getInvoiceStats).not.toHaveBeenCalled();
    expect(data.initialLoaded.value).toBe(false);
    expect(data.loadError.value).toBeNull();
  });

  it('surfaces invoice list errors through loadError and onError', async () => {
    const listError = new ApiError('Invoices request failed', { status: 500 });
    const listInvoices = vi.fn().mockRejectedValue(listError);
    const getInvoiceStats = vi.fn().mockResolvedValue(createStatsResponse());
    const onError = vi.fn();

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      onError,
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await flushPromises();

    expect(data.loadError.value).toBe(listError);
    expect(data.initialLoaded.value).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'Invoices request failed',
      listError,
      'load-invoices',
    );
  });

  it('surfaces stats errors through loadError and onError', async () => {
    const statsError = new ApiError('Stats request failed', { status: 500 });
    const listInvoices = vi.fn().mockResolvedValue(createListResponse());
    const getInvoiceStats = vi.fn().mockRejectedValue(statsError);
    const onError = vi.fn();

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      onError,
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await flushPromises();

    expect(data.loadError.value).toBe(statsError);
    expect(data.invoices.value).toEqual(createListResponse());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'Stats request failed',
      statsError,
      'load-invoices',
    );
  });

  it('refetches the invoice list when filters change', async () => {
    const query = ref<Partial<InvoiceListQuery>>({});
    const listInvoices = vi.fn().mockResolvedValue(createListResponse());
    const getInvoiceStats = vi.fn().mockResolvedValue(createStatsResponse());

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      query,
    });

    await flushPromises();
    expect(listInvoices).toHaveBeenCalledTimes(1);

    query.value = { status: 'draft', projectId };
    await flushPromises();

    expect(listInvoices).toHaveBeenCalledTimes(2);
    expect(listInvoices).toHaveBeenNthCalledWith(2, {
      status: 'draft',
      projectId,
    });
    expect(getInvoiceStats).toHaveBeenCalledTimes(1);
    expect(data.invoices.value).toEqual(createListResponse());
  });

  it('refetches both invoices and stats on demand', async () => {
    const listInvoices = vi.fn().mockResolvedValue(createListResponse());
    const getInvoiceStats = vi.fn().mockResolvedValue(createStatsResponse());

    const data = mountInvoicesData({
      client: { getInvoiceStats, listInvoices },
      enabled: ref(true),
      query: ref<Partial<InvoiceListQuery>>({}),
    });

    await flushPromises();
    expect(listInvoices).toHaveBeenCalledTimes(1);
    expect(getInvoiceStats).toHaveBeenCalledTimes(1);

    await data.refetch();
    await flushPromises();

    expect(listInvoices).toHaveBeenCalledTimes(2);
    expect(getInvoiceStats).toHaveBeenCalledTimes(2);
    expect(data.invoicesLoading.value).toBe(false);
    expect(data.statsLoading.value).toBe(false);
    expect(data.initialLoaded.value).toBe(true);
  });
});
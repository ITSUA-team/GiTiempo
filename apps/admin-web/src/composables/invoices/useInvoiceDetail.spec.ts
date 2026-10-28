import { defineComponent, nextTick, ref, shallowRef, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { InvoiceResponse, InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';

import { createTestQueryPlugin } from '@/test/query-client';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useInvoiceDetail } from './useInvoiceDetail';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';
const timeEntryId = '55555555-5555-4555-8555-555555555555';
const taskId = '66666666-6666-4666-8666-666666666666';

function createScope() {
  return shallowRef({ role: 'admin', userId: 'user-1', workspaceId });
}

function createTimeEntrySummary(
  overrides: Partial<InvoiceTimeEntrySummary> = {},
): InvoiceTimeEntrySummary {
  return {
    description: null,
    durationSeconds: 9000,
    roundedDurationSeconds: 9000,
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

function createInvoice(overrides: Partial<InvoiceResponse> = {}): InvoiceResponse {
  return {
    createdAt: '2026-05-01T10:00:00.000Z',
    createdBy: userId,
    createdByName: 'Alex Admin',
    currency: 'USD',
    dateFrom: '2026-04-01',
    dateTo: '2026-04-30',
    discountPercent: 0,
    hourlyRate: 80,
    id: invoiceId,
    notes: null,
    project: { id: projectId, name: 'Project Orion' },
    projectId,
    roundingStepMinutes: 1,
    status: 'draft',
    timeEntries: [createTimeEntrySummary()],
    timeEntryCount: 1,
    title: 'April 2026 — Backend',
    totalAmount: 200,
    totalHours: 2.5,
    updatedAt: '2026-05-01T10:00:00.000Z',
    workspaceId,
    ...overrides,
  };
}

function mountInvoiceDetail(
  options: {
    client: Pick<AdminInvoicesClient, 'getInvoice'>;
    enabled?: Ref<boolean>;
    invoiceId?: Ref<string>;
    onError?: (message: string, error: unknown, action: string) => void;
  },
) {
  let data!: ReturnType<typeof useInvoiceDetail>;

  mount(
    defineComponent({
      setup() {
        data = useInvoiceDetail({
          client: options.client,
          enabled: options.enabled ?? ref(true),
          invoiceId: options.invoiceId ?? ref(invoiceId),
          onError: options.onError,
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

describe('useInvoiceDetail', () => {
  it('loads the invoice for the requested id', async () => {
    const getInvoice = vi.fn().mockResolvedValue(createInvoice());

    const data = mountInvoiceDetail({ client: { getInvoice } });

    await flushPromises();

    expect(getInvoice).toHaveBeenCalledTimes(1);
    expect(getInvoice).toHaveBeenCalledWith(invoiceId);
    expect(data.invoice.value).toEqual(createInvoice());
    expect(data.loading.value).toBe(false);
    expect(data.notFound.value).toBe(false);
    expect(data.error.value).toBeNull();
  });

  it('keeps the invoice loading until the request settles', async () => {
    let resolveInvoice!: (value: InvoiceResponse) => void;
    const getInvoice = vi.fn(
      () =>
        new Promise<InvoiceResponse>((resolve) => {
          resolveInvoice = resolve;
        }),
    );

    const data = mountInvoiceDetail({ client: { getInvoice } });

    await nextTick();

    expect(data.loading.value).toBe(true);
    expect(data.invoice.value).toBeUndefined();

    resolveInvoice(createInvoice());
    await flushPromises();

    expect(data.loading.value).toBe(false);
    expect(data.invoice.value).toEqual(createInvoice());
  });

  it('does not fetch while disabled', async () => {
    const getInvoice = vi.fn().mockResolvedValue(createInvoice());

    const data = mountInvoiceDetail({
      client: { getInvoice },
      enabled: ref(false),
    });

    await flushPromises();

    expect(getInvoice).not.toHaveBeenCalled();
    expect(data.invoice.value).toBeUndefined();
    expect(data.notFound.value).toBe(false);
  });

  it('fetches when enabled transitions from false to true', async () => {
    const enabled = ref(false);
    const getInvoice = vi.fn().mockResolvedValue(createInvoice());

    const data = mountInvoiceDetail({ client: { getInvoice }, enabled });

    await flushPromises();

    expect(getInvoice).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();

    expect(getInvoice).toHaveBeenCalledTimes(1);
    expect(data.invoice.value).toEqual(createInvoice());
  });

  it('refetches when invoiceId changes', async () => {
    const invoiceIdRef = ref(invoiceId);
    const getInvoice = vi.fn().mockResolvedValue(createInvoice());

    const data = mountInvoiceDetail({
      client: { getInvoice },
      invoiceId: invoiceIdRef,
    });

    await flushPromises();

    expect(getInvoice).toHaveBeenCalledTimes(1);
    expect(getInvoice).toHaveBeenCalledWith(invoiceId);

    getInvoice.mockResolvedValueOnce(
      createInvoice({ id: 'invoice-2', title: 'Second Invoice' }),
    );
    invoiceIdRef.value = 'invoice-2';
    await flushPromises();

    expect(getInvoice).toHaveBeenCalledTimes(2);
    expect(getInvoice).toHaveBeenCalledWith('invoice-2');
    expect(data.invoice.value?.id).toBe('invoice-2');
  });

  it('marks a 404 response as not found', async () => {
    const notFoundError = new ApiError('Invoice not found', {
      code: 'invoice_not_found',
      status: 404,
    });
    const getInvoice = vi.fn().mockRejectedValue(notFoundError);
    const onError = vi.fn();

    const data = mountInvoiceDetail({
      client: { getInvoice },
      onError,
    });

    await flushPromises();

    expect(data.notFound.value).toBe(true);
    expect(data.error.value).toBe(notFoundError);
    expect(data.invoice.value).toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'Invoice not found',
      notFoundError,
      'load-invoice',
    );
  });

  it('keeps notFound false for request errors other than 404', async () => {
    const serverError = new ApiError('Invoice request failed', { status: 500 });
    const getInvoice = vi.fn().mockRejectedValue(serverError);
    const onError = vi.fn();

    const data = mountInvoiceDetail({
      client: { getInvoice },
      onError,
    });

    await flushPromises();

    expect(data.notFound.value).toBe(false);
    expect(data.error.value).toBe(serverError);
    expect(onError).toHaveBeenCalledWith(
      'Invoice request failed',
      serverError,
      'load-invoice',
    );
  });

  it('refetches the invoice for the requested id on demand', async () => {
    const getInvoice = vi.fn().mockResolvedValue(createInvoice());

    const data = mountInvoiceDetail({ client: { getInvoice } });

    await flushPromises();
    expect(getInvoice).toHaveBeenCalledTimes(1);

    await data.refetch();
    await flushPromises();

    expect(getInvoice).toHaveBeenCalledTimes(2);
    expect(getInvoice).toHaveBeenNthCalledWith(2, invoiceId);
    expect(data.invoice.value).toEqual(createInvoice());
    expect(data.loading.value).toBe(false);
  });
});
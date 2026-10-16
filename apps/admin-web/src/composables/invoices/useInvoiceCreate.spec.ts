import { defineComponent, nextTick, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type {
  CreateInvoiceInput,
  InvoiceResponse,
} from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';

import { createTestQueryClient, createTestQueryPlugin } from '@/test/query-client';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useInvoiceCreate } from './useInvoiceCreate';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';

function createScope(): AdminServerStateScope {
  return { role: 'admin', userId: 'user-1', workspaceId };
}

function createInput(): CreateInvoiceInput {
  return {
    currency: 'USD',
    dateFrom: '2026-04-01',
    dateTo: '2026-04-30',
    discountPercent: 0,
    hourlyRate: 80,
    notes: null,
    projectId,
    title: 'April 2026 — Backend',
  };
}

function createInvoiceResponse(): InvoiceResponse {
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
    status: 'draft',
    timeEntries: [],
    timeEntryCount: 0,
    title: 'April 2026 — Backend',
    totalAmount: 1000,
    totalHours: 12.5,
    updatedAt: '2026-05-01T10:00:00.000Z',
    workspaceId,
  };
}

function mountInvoiceCreate(
  options: {
    client: Pick<AdminInvoicesClient, 'createInvoice'>;
    onError?: (message: string, error: unknown, action: string) => void;
    onSuccess?: () => void;
  },
  queryClient = createTestQueryClient(),
) {
  let data!: ReturnType<typeof useInvoiceCreate>;

  mount(
    defineComponent({
      setup() {
        data = useInvoiceCreate({
          client: options.client,
          onError: options.onError,
          onSuccess: options.onSuccess,
          scope: shallowRef(createScope()),
        });
        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin(queryClient)],
      },
    },
  );

  return data;
}

describe('useInvoiceCreate', () => {
  it('creates an invoice, invalidates the invoice cache, and reports success', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      adminInvoicesKeys.list(createScope()),
      { items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } },
    );
    queryClient.setQueryData(
      adminInvoicesKeys.stats(createScope()),
      { byStatus: { draft: 0, sent: 0, paid: 0 }, thisMonth: { currency: 'USD', invoiceCount: 0, projectCount: 0, totalAmount: 0 } },
    );
    const createInvoiceMock = vi.fn().mockResolvedValue(createInvoiceResponse());
    const onSuccess = vi.fn();

    const data = mountInvoiceCreate(
      {
        client: { createInvoice: createInvoiceMock },
        onSuccess,
      },
      queryClient,
    );

    await flushPromises();
    const created = await data.createInvoice(createInput());
    await flushPromises();

    expect(created).toEqual(createInvoiceResponse());
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock).toHaveBeenCalledWith(createInput());
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(adminInvoicesKeys.list(createScope()))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(adminInvoicesKeys.stats(createScope()))?.isInvalidated).toBe(true);
  });

  it.each([
    ['invoice_rate_required', 'Hourly rate is required'],
    ['invoice_currency_required', 'Currency is required'],
    ['invoice_total_overflow', 'Invoice total exceeds the allowed maximum'],
  ] as const)(
    'rethrows %s domain errors after reporting them',
    async (code, message) => {
      const domainError = new ApiError(message, { code, status: 422 });
      const createInvoiceMock = vi.fn().mockRejectedValue(domainError);
      const onError = vi.fn();
      const onSuccess = vi.fn();
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        adminInvoicesKeys.list(createScope()),
        { items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } },
      );

      const data = mountInvoiceCreate(
        {
          client: { createInvoice: createInvoiceMock },
          onError,
          onSuccess,
        },
        queryClient,
      );

      await flushPromises();

      await expect(data.createInvoice(createInput())).rejects.toBe(domainError);
      await flushPromises();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(message, domainError, 'create-invoice');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(
        queryClient.getQueryState(adminInvoicesKeys.list(createScope()))
          ?.isInvalidated,
      ).toBe(false);
    },
  );

  it('tracks creation progress with isCreating', async () => {
    let resolveCreate!: (value: InvoiceResponse) => void;
    const createInvoiceMock = vi.fn(
      () =>
        new Promise<InvoiceResponse>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onSuccess = vi.fn();

    const data = mountInvoiceCreate({
      client: { createInvoice: createInvoiceMock },
      onSuccess,
    });

    await flushPromises();

    const pending = data.createInvoice(createInput());
    await nextTick();

    expect(data.isCreating.value).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    resolveCreate(createInvoiceResponse());
    await pending;
    await flushPromises();

    expect(data.isCreating.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not guard against concurrent calls', async () => {
    // Documents current behavior: a second createInvoice call while the first
    // is still pending issues a second POST. Double-click protection is the
    // dialog's responsibility.
    const createInvoiceMock = vi
      .fn()
      .mockResolvedValue(createInvoiceResponse());
    const data = mountInvoiceCreate({
      client: { createInvoice: createInvoiceMock },
    });

    await flushPromises();

    const promise1 = data.createInvoice(createInput());
    const promise2 = data.createInvoice(createInput());
    await Promise.all([promise1, promise2]);
    await flushPromises();

    expect(createInvoiceMock).toHaveBeenCalledTimes(2);
    expect(createInvoiceMock).toHaveBeenNthCalledWith(1, createInput());
    expect(createInvoiceMock).toHaveBeenNthCalledWith(2, createInput());
  });
});
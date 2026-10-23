import { defineComponent, nextTick, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { InvoiceResponse, UpdateInvoiceInput } from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';

import { createTestQueryClient, createTestQueryPlugin } from '@/test/query-client';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useInvoiceUpdate } from './useInvoiceUpdate';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';

function createScope(): AdminServerStateScope {
  return { role: 'admin', userId: 'user-1', workspaceId };
}

function createInvoiceResponse(overrides: Partial<InvoiceResponse> = {}): InvoiceResponse {
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
    timeEntries: [],
    timeEntryCount: 0,
    title: 'April 2026 — Backend',
    totalAmount: 1000,
    totalHours: 12.5,
    updatedAt: '2026-05-01T10:00:00.000Z',
    workspaceId,
    ...overrides,
  };
}

function mountInvoiceUpdate(
  options: {
    client: Pick<AdminInvoicesClient, 'updateInvoice'>;
    onError?: (message: string, error: unknown, action: string) => void;
    onSuccess?: (invoice: InvoiceResponse) => void;
  },
  queryClient = createTestQueryClient(),
) {
  let data!: ReturnType<typeof useInvoiceUpdate>;

  mount(
    defineComponent({
      setup() {
        data = useInvoiceUpdate({
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

describe('useInvoiceUpdate', () => {
  it('updates invoice fields, invalidates the invoice cache, and reports success', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      adminInvoicesKeys.list(createScope()),
      { items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } },
    );
    queryClient.setQueryData(
      adminInvoicesKeys.detail(createScope(), invoiceId),
      createInvoiceResponse(),
    );
    const updatedInvoice = createInvoiceResponse({
      notes: 'Approved by finance',
      title: 'April 2026 — Backend (final)',
    });
    const updateInvoiceMock = vi.fn().mockResolvedValue(updatedInvoice);
    const onSuccess = vi.fn();
    const data: UpdateInvoiceInput = {
      notes: 'Approved by finance',
      title: 'April 2026 — Backend (final)',
    };

    const composable = mountInvoiceUpdate(
      {
        client: { updateInvoice: updateInvoiceMock },
        onSuccess,
      },
      queryClient,
    );

    await flushPromises();
    const invoice = await composable.updateInvoice({ data, invoiceId });
    await flushPromises();

    expect(invoice).toEqual(updatedInvoice);
    expect(updateInvoiceMock).toHaveBeenCalledTimes(1);
    expect(updateInvoiceMock).toHaveBeenCalledWith(invoiceId, data);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(updatedInvoice);
    expect(
      queryClient.getQueryState(adminInvoicesKeys.list(createScope()))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(adminInvoicesKeys.detail(createScope(), invoiceId))
        ?.isInvalidated,
    ).toBe(true);
  });

  it.each([
    [
      'invoice_update_conflict',
      'Invoice was modified after it was loaded. Reload to see the latest version.',
    ],
    [
      'invoice_invalid_status_transition',
      'Cannot change the status of a paid invoice.',
    ],
  ] as const)(
    'rethrows %s conflicts so the caller can reload',
    async (code, message) => {
      const conflictError = new ApiError(message, { code, status: 409 });
      const updateInvoiceMock = vi.fn().mockRejectedValue(conflictError);
      const onError = vi.fn();
      const onSuccess = vi.fn();

      const composable = mountInvoiceUpdate({
        client: { updateInvoice: updateInvoiceMock },
        onError,
        onSuccess,
      });

      await flushPromises();

      await expect(
        composable.updateInvoice({
          data: { status: 'paid' },
          invoiceId,
        }),
      ).rejects.toBe(conflictError);
      await flushPromises();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(message, conflictError, 'update-invoice');
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it('tracks update progress with isUpdating', async () => {
    let resolveUpdate!: (value: InvoiceResponse) => void;
    const updateInvoiceMock = vi.fn(
      () =>
        new Promise<InvoiceResponse>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const onSuccess = vi.fn();

    const composable = mountInvoiceUpdate({
      client: { updateInvoice: updateInvoiceMock },
      onSuccess,
    });

    await flushPromises();

    const pending = composable.updateInvoice({
      data: { title: 'April 2026 — Backend (final)' },
      invoiceId,
    });
    await nextTick();

    expect(composable.isUpdating.value).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    resolveUpdate(createInvoiceResponse());
    await pending;
    await flushPromises();

    expect(composable.isUpdating.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
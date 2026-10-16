import { defineComponent, nextTick, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@gitiempo/web-shared/http';

import { createTestQueryClient, createTestQueryPlugin } from '@/test/query-client';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import type { AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useInvoiceDelete } from './useInvoiceDelete';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const invoiceId = '22222222-2222-4222-8222-222222222222';

function createScope(): AdminServerStateScope {
  return { role: 'admin', userId: 'user-1', workspaceId };
}

const emptyListResponse = {
  items: [],
  meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
};

const emptyStatsResponse = {
  byStatus: { draft: 0, sent: 0, paid: 0 },
  thisMonth: { currency: 'USD', invoiceCount: 0, projectCount: 0, totalAmount: 0 },
};

function mountInvoiceDelete(
  options: {
    client: Pick<AdminInvoicesClient, 'deleteInvoice'>;
    onError?: (message: string, error: unknown, action: string) => void;
    onSuccess?: () => void;
  },
  queryClient = createTestQueryClient(),
) {
  let data!: ReturnType<typeof useInvoiceDelete>;

  mount(
    defineComponent({
      setup() {
        data = useInvoiceDelete({
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

describe('useInvoiceDelete', () => {
  it('deletes an invoice, invalidates the invoice cache, and reports success', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(adminInvoicesKeys.list(createScope()), emptyListResponse);
    queryClient.setQueryData(adminInvoicesKeys.stats(createScope()), emptyStatsResponse);
    queryClient.setQueryData(
      adminInvoicesKeys.detail(createScope(), invoiceId),
      { id: invoiceId },
    );
    const deleteInvoiceMock = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const data = mountInvoiceDelete(
      {
        client: { deleteInvoice: deleteInvoiceMock },
        onSuccess,
      },
      queryClient,
    );

    await flushPromises();
    await data.deleteInvoice(invoiceId);
    await flushPromises();

    expect(deleteInvoiceMock).toHaveBeenCalledTimes(1);
    expect(deleteInvoiceMock).toHaveBeenCalledWith(invoiceId);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryState(adminInvoicesKeys.list(createScope()))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(adminInvoicesKeys.stats(createScope()))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(adminInvoicesKeys.detail(createScope(), invoiceId))
        ?.isInvalidated,
    ).toBe(true);
  });

  it('rethrows invoice_not_deletable conflicts so the caller can reload', async () => {
    const conflictError = new ApiError(
      'Only draft invoices can be deleted.',
      { code: 'invoice_not_deletable', status: 409 },
    );
    const deleteInvoiceMock = vi.fn().mockRejectedValue(conflictError);
    const onError = vi.fn();
    const onSuccess = vi.fn();

    const data = mountInvoiceDelete({
      client: { deleteInvoice: deleteInvoiceMock },
      onError,
      onSuccess,
    });

    await flushPromises();

    await expect(data.deleteInvoice(invoiceId)).rejects.toBe(conflictError);
    await flushPromises();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'Only draft invoices can be deleted.',
      conflictError,
      'delete-invoice',
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('tracks deletion progress with isDeleting', async () => {
    let resolveDelete!: () => void;
    const deleteInvoiceMock = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const onSuccess = vi.fn();

    const data = mountInvoiceDelete({
      client: { deleteInvoice: deleteInvoiceMock },
      onSuccess,
    });

    await flushPromises();

    const pending = data.deleteInvoice(invoiceId);
    await nextTick();

    expect(data.isDeleting.value).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    resolveDelete();
    await pending;
    await flushPromises();

    expect(data.isDeleting.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
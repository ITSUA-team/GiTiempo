import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { InvoiceResponse, UpdateInvoiceInput } from '@gitiempo/shared';
import { getErrorMessage } from '@gitiempo/web-shared';

import { invalidateQueryKeys } from '@/composables/query';
import {
  adminMutationInvalidationKeys,
  type AdminServerStateScope,
} from '@/lib/query-keys';
import {
  adminInvoicesClient,
  type AdminInvoicesClient,
} from '@/services/admin-invoices-client';

interface UpdateInvoicePayload {
  data: UpdateInvoiceInput;
  invoiceId: string;
}

interface UseInvoiceUpdateOptions {
  client?: Pick<AdminInvoicesClient, 'updateInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: (invoice: InvoiceResponse) => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

const UPDATE_ACTION = 'update-invoice';

export function useInvoiceUpdate({
  client = adminInvoicesClient,
  onError,
  onSuccess,
  scope,
}: UseInvoiceUpdateOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ data, invoiceId }: UpdateInvoicePayload) =>
      client.updateInvoice(invoiceId, data),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(toValue(scope)),
      );
    },
  });

  // 409 domain errors are rethrown so the caller can swallow the already-reported
  // error and preserve local form state; conflict reload happens in onError.
  async function updateInvoice(
    payload: UpdateInvoicePayload,
  ): Promise<InvoiceResponse> {
    try {
      const invoice = await mutation.mutateAsync(payload);
      onSuccess?.(invoice);
      return invoice;
    } catch (error) {
      onError?.(getErrorMessage(error), error, UPDATE_ACTION);
      throw error;
    }
  }

  return {
    isUpdating: computed(() => mutation.isPending.value),
    updateInvoice,
  };
}
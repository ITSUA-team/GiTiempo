import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

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

interface UseInvoiceDeleteOptions {
  client?: Pick<AdminInvoicesClient, 'deleteInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: () => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

const DELETE_ACTION = 'delete-invoice';

export function useInvoiceDelete({
  client = adminInvoicesClient,
  onError,
  onSuccess,
  scope,
}: UseInvoiceDeleteOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (invoiceId: string) => client.deleteInvoice(invoiceId),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(toValue(scope)),
      );
    },
  });

  // invoice_not_deletable conflicts are rethrown so the caller can reload the
  // detail; the confirmation dialog stays with the view, not this composable.
  async function deleteInvoice(invoiceId: string): Promise<void> {
    try {
      await mutation.mutateAsync(invoiceId);
      onSuccess?.();
    } catch (error) {
      onError?.(getErrorMessage(error), error, DELETE_ACTION);
      throw error;
    }
  }

  return {
    deleteInvoice,
    isDeleting: computed(() => mutation.isPending.value),
  };
}
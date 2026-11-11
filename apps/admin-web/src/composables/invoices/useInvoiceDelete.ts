import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

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

  const generation = shallowRef(0);
  watch(() => JSON.stringify(toValue(scope)), () => { generation.value++; }, { flush: 'sync' });

  const mutation = useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string; requestScope: AdminServerStateScope; generation: number }) => client.deleteInvoice(invoiceId),
    onSuccess: async (_result, variables) => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(variables.requestScope),
      );
    },
  });

  // Conflicts are rethrown so the caller can swallow the already-reported error;
  // conflict reload happens in onError, confirmation stays with the view.
  async function deleteInvoice(invoiceId: string): Promise<void> {
    const requestGeneration = generation.value;
    const requestScope = { ...toValue(scope) };
    try {
      await mutation.mutateAsync({ invoiceId, requestScope, generation: requestGeneration });
      if (requestGeneration === generation.value) onSuccess?.();
    } catch (error) {
      if (requestGeneration === generation.value) onError?.(getErrorMessage(error), error, DELETE_ACTION);
      throw error;
    }
  }

  return {
    deleteInvoice,
    isDeleting: computed(() => mutation.isPending.value && mutation.variables.value?.generation === generation.value),
  };
}
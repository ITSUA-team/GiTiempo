import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { CreateInvoiceInput, InvoiceResponse } from '@gitiempo/shared';
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

interface UseInvoiceCreateOptions {
  client?: Pick<AdminInvoicesClient, 'createInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: () => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

const CREATE_ACTION = 'create-invoice';

export function useInvoiceCreate({
  client = adminInvoicesClient,
  onError,
  onSuccess,
  scope,
}: UseInvoiceCreateOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateInvoiceInput) => client.createInvoice(input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(toValue(scope)),
      );
    },
  });

  async function createInvoice(
    input: CreateInvoiceInput,
  ): Promise<InvoiceResponse> {
    try {
      const invoice = await mutation.mutateAsync(input);
      onSuccess?.();
      return invoice;
    } catch (error) {
      onError?.(getErrorMessage(error), error, CREATE_ACTION);
      throw error;
    }
  }

  return {
    createInvoice,
    isCreating: computed(() => mutation.isPending.value),
  };
}
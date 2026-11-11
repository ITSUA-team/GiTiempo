import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

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

  const generation = shallowRef(0);
  watch(() => JSON.stringify(toValue(scope)), () => { generation.value++; }, { flush: 'sync' });

  const mutation = useMutation({
    mutationFn: ({ input }: { input: CreateInvoiceInput; requestScope: AdminServerStateScope; generation: number }) => client.createInvoice(input),
    onSuccess: async (_result, variables) => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(variables.requestScope),
      );
    },
  });

  async function createInvoice(
    input: CreateInvoiceInput,
  ): Promise<InvoiceResponse> {
    const requestGeneration = generation.value;
    const requestScope = { ...toValue(scope) };
    try {
      const invoice = await mutation.mutateAsync({ input, requestScope, generation: requestGeneration });
      if (requestGeneration === generation.value) onSuccess?.();
      return invoice;
    } catch (error) {
      if (requestGeneration === generation.value) onError?.(getErrorMessage(error), error, CREATE_ACTION);
      throw error;
    }
  }

  return {
    createInvoice,
    isCreating: computed(() => mutation.isPending.value && mutation.variables.value?.generation === generation.value),
  };
}
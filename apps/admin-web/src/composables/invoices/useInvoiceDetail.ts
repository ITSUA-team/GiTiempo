import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type { InvoiceResponse } from '@gitiempo/shared';
import { getErrorMessage } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';

import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import {
  adminInvoicesClient,
  type AdminInvoicesClient,
} from '@/services/admin-invoices-client';

interface UseInvoiceDetailOptions {
  client?: Pick<AdminInvoicesClient, 'getInvoice'>;
  enabled: MaybeRefOrGetter<boolean>;
  invoiceId: MaybeRefOrGetter<string>;
  onError?: (message: string, error: unknown, action: string) => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

const LOAD_ACTION = 'load-invoice';

export function useInvoiceDetail({
  client = adminInvoicesClient,
  enabled,
  invoiceId,
  onError,
  scope,
}: UseInvoiceDetailOptions) {
  const invoiceQuery = useQuery({
    enabled: computed(() => toValue(enabled)),
    queryFn: () => client.getInvoice(toValue(invoiceId)),
    queryKey: computed(() =>
      adminInvoicesKeys.detail(toValue(scope), toValue(invoiceId)),
    ),
  });

  watch(
    () => invoiceQuery.error.value,
    (error) => {
      if (error) {
        onError?.(getErrorMessage(error), error, LOAD_ACTION);
      }
    },
  );

  return {
    error: computed(() => invoiceQuery.error.value),
    invoice: computed<InvoiceResponse | undefined>(
      () => invoiceQuery.data.value,
    ),
    loading: computed(() => invoiceQuery.isLoading.value),
    notFound: computed(() => isApiErrorStatus(invoiceQuery.error.value, [404])),
    refetch: () => invoiceQuery.refetch({ throwOnError: false }),
  };
}
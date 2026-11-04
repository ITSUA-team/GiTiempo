import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
  adminInvoicesClient,
  type AdminInvoicesClient,
} from '@/services/admin-invoices-client';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface UseInvoiceDefaultsOptions {
  client?: Pick<AdminInvoicesClient, 'getInvoiceDefaults'>;
  enabled: MaybeRefOrGetter<boolean>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

export function useInvoiceDefaults({
  client = adminInvoicesClient,
  enabled,
  scope,
}: UseInvoiceDefaultsOptions) {
  const invoiceDefaultsQuery = useQuery({
    enabled: computed(() => toValue(enabled)),
    queryFn: () => client.getInvoiceDefaults(),
    queryKey: computed(() => adminInvoicesKeys.defaults(toValue(scope))),
  });

  return {
    invoiceDefaultsQuery,
    workspaceCurrency: computed(
      () => invoiceDefaultsQuery.data.value?.currency ?? null,
    ),
    workspaceHourlyRate: computed(
      () => invoiceDefaultsQuery.data.value?.defaultHourlyRate ?? null,
    ),
    workspaceRoundingStepMinutes: computed(
      () => invoiceDefaultsQuery.data.value?.timeRoundingStepMinutes ?? null,
    ),
  };
}
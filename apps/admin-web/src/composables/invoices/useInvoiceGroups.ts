import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import { adminInvoicesClient } from '@/services/admin-invoices-client';

export function useInvoiceGroups(options: {
  enabled: MaybeRefOrGetter<boolean>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}) {
  return useQuery({
    enabled: computed(() => toValue(options.enabled)),
    queryKey: computed(() => adminInvoicesKeys.groups(toValue(options.scope))),
    queryFn: () => adminInvoicesClient.listGroups(),
  });
}

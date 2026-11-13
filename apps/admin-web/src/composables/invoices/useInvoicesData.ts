import { matchQuery, useQuery } from '@tanstack/vue-query';
import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type {
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceStatsResponse,
} from '@gitiempo/shared';
import { getErrorMessage } from '@gitiempo/web-shared';

import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';
import {
  adminInvoicesClient,
  type AdminInvoicesClient,
} from '@/services/admin-invoices-client';

interface UseInvoicesDataOptions {
  client?: Pick<AdminInvoicesClient, 'getInvoiceStats' | 'listInvoices'>;
  enabled: MaybeRefOrGetter<boolean>;
  onError?: (message: string, error: unknown, action: string) => void;
  query?: MaybeRefOrGetter<Partial<InvoiceListQuery>>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

const LOAD_ACTION = 'load-invoices';

export function useInvoicesData({
  client = adminInvoicesClient,
  enabled,
  onError,
  query = {},
  scope,
}: UseInvoicesDataOptions) {
  const invoicesQuery = useQuery<InvoiceListResponse>(() => {
    const listScope = toValue(scope);
    const filters = toValue(query);
    const canLoad = toValue(enabled);
    return {
      enabled: canLoad,
      queryFn: () => client.listInvoices(filters),
      queryKey: adminInvoicesKeys.list(listScope, filters),
      placeholderData: (previous, previousQuery) => {
        const groupKey = [...adminInvoicesKeys.all(listScope), 'list', { groupId: filters.groupId ?? null }];
        return canLoad && previousQuery && matchQuery({ queryKey: groupKey }, previousQuery)
          ? previous
          : undefined;
      },
    };
  });
  const statsQuery = useQuery({
    enabled: computed(() => toValue(enabled)),
    queryFn: () => client.getInvoiceStats(),
    queryKey: computed(() => adminInvoicesKeys.stats(toValue(scope))),
  });

  watch(
    [invoicesQuery.error, statsQuery.error],
    ([invoicesError, statsError]) => {
      const error = invoicesError ?? statsError;
      if (error) {
        onError?.(getErrorMessage(error), error, LOAD_ACTION);
      }
    },
  );

  async function refetch(): Promise<void> {
    await Promise.all([
      invoicesQuery.refetch({ throwOnError: false }),
      statsQuery.refetch({ throwOnError: false }),
    ]);
  }

  return {
    initialLoaded: computed(
      () => invoicesQuery.isSuccess.value && statsQuery.isSuccess.value,
    ),
    invoices: computed<InvoiceListResponse | undefined>(
      () => invoicesQuery.data.value,
    ),
    invoicesLoading: computed(() => invoicesQuery.isFetching.value),
    placeholderRows: invoicesQuery.isPlaceholderData,
    loadError: computed(
      () => invoicesQuery.error.value ?? statsQuery.error.value,
    ),
    refetch,
    stats: computed<InvoiceStatsResponse | undefined>(
      () => statsQuery.data.value,
    ),
    statsLoading: computed(() => statsQuery.isLoading.value),
  };
}

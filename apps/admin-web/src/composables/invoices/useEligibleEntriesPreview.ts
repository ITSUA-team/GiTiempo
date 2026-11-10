import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { EligibleEntriesQuery } from '@gitiempo/shared';

import {
  adminInvoicesClient,
  type AdminInvoicesClient,
} from '@/services/admin-invoices-client';
import { adminInvoicesKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface UseEligibleEntriesPreviewOptions {
  client?: Pick<AdminInvoicesClient, 'listEligibleEntries'>;
  enabled: MaybeRefOrGetter<boolean>;
  query?: MaybeRefOrGetter<EligibleEntriesQuery | null>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

export function useEligibleEntriesPreview({
  client = adminInvoicesClient,
  enabled,
  query = null,
  scope,
}: UseEligibleEntriesPreviewOptions) {
  // The preview only exists once both date bounds are chosen; a null query
  // keeps the request parked until the caller settles both bounds.
  const settledQuery = computed(() => {
    const requestedQuery = toValue(query);
    return toValue(enabled) && requestedQuery ? requestedQuery : null;
  });

  const entriesQuery = useQuery({
    enabled: computed(() => settledQuery.value !== null),
    queryFn: () => {
      const currentQuery = settledQuery.value;
      if (!currentQuery) {
        throw new Error(
          'Eligible entries preview requires both date bounds to be set',
        );
      }
      return client.listEligibleEntries(currentQuery);
    },
    queryKey: computed(() =>
      adminInvoicesKeys.eligibleEntries(
        toValue(scope),
        settledQuery.value ?? undefined,
      ),
    ),
  });

  return {
    hasEntries: computed(() => (entriesQuery.data.value?.count ?? 0) > 0),
    isEmpty: computed(
      () =>
        entriesQuery.data.value !== undefined &&
        entriesQuery.data.value.count === 0,
    ),
    isError: computed(() => entriesQuery.isError.value),
    isLoading: computed(() => entriesQuery.isLoading.value),
    preview: computed(() => entriesQuery.data.value),
  };
}
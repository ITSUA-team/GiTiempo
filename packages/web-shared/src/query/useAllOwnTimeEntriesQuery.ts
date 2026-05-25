import { useQuery } from "@tanstack/vue-query";
import type { TimeEntryListQuery, TimeEntryResponse } from "@gitiempo/shared";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface AllOwnTimeEntriesClient {
  listOwnEntries(
    accessToken: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<{ items: TimeEntryResponse[]; meta: { totalPages: number } }>;
}
/* eslint-enable no-unused-vars */

type AllOwnTimeEntriesQuery = Omit<Partial<TimeEntryListQuery>, "page">;

interface UseAllOwnTimeEntriesQueryOptions extends QueryAccessOptions {
  client: AllOwnTimeEntriesClient;
  query: MaybeRefOrGetter<AllOwnTimeEntriesQuery>;
}

const allOwnEntriesPageLimit = 100;

async function listAllOwnEntries(
  client: AllOwnTimeEntriesClient,
  accessToken: string,
  query: AllOwnTimeEntriesQuery,
): Promise<TimeEntryResponse[]> {
  const items: TimeEntryResponse[] = [];
  const limit = query.limit ?? allOwnEntriesPageLimit;
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await client.listOwnEntries(accessToken, {
      ...query,
      limit,
      page: currentPage,
    });

    items.push(...response.items);
    totalPages = Math.max(response.meta.totalPages, 1);
    currentPage += 1;
  } while (currentPage <= totalPages);

  return items;
}

export const useAllOwnTimeEntriesQuery = (
  options: UseAllOwnTimeEntriesQueryOptions,
) => {
  const normalizedQuery = computed(() => {
    const query = toValue(options.query);

    return {
      ...query,
      limit: query.limit ?? allOwnEntriesPageLimit,
    };
  });

  return useQuery({
    queryKey: computed(() => ["all_own_time_entries", normalizedQuery.value]),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      listAllOwnEntries(
        options.client,
        requireAccessToken(toValue(options.accessToken)),
        normalizedQuery.value,
      ),
  });
};

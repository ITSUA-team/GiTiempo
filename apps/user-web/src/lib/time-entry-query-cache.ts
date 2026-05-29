import type { QueryClient, QueryKey } from "@tanstack/vue-query";
import type {
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";

import { timeEntriesKeys, type UserServerStateScope } from "@/lib/query-keys";

interface NormalizedTimeEntryListQuery {
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number | null;
  page?: number | null;
  projectId?: string | null;
  search?: string | null;
  taskId?: string | null;
}

function compareTimeEntriesByRecency(
  left: TimeEntryResponse,
  right: TimeEntryResponse,
): number {
  const startedAtDiff =
    new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();

  if (startedAtDiff !== 0) {
    return startedAtDiff;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimeEntryListResponse(
  value: unknown,
): value is TimeEntryListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    isRecord(value.meta)
  );
}

function readTimeEntryQuery(
  queryKey: QueryKey,
): NormalizedTimeEntryListQuery {
  const maybeQuery = queryKey[4];

  return isRecord(maybeQuery)
    ? (maybeQuery as NormalizedTimeEntryListQuery)
    : {};
}

function entryMatchesQuery(
  entry: TimeEntryResponse,
  query: NormalizedTimeEntryListQuery,
): boolean {
  const startedAtMs = new Date(entry.startedAt).getTime();

  if (query.dateFrom && startedAtMs < new Date(query.dateFrom).getTime()) {
    return false;
  }

  if (query.dateTo && startedAtMs >= new Date(query.dateTo).getTime()) {
    return false;
  }

  if (query.projectId && entry.projectId !== query.projectId) {
    return false;
  }

  if (query.taskId && entry.taskId !== query.taskId) {
    return false;
  }

  if (query.search) {
    const search = query.search.toLowerCase();

    return entry.task.title.toLowerCase().includes(search);
  }

  return true;
}

function reconcileEntries(
  items: TimeEntryResponse[],
  entry: TimeEntryResponse,
  query: NormalizedTimeEntryListQuery,
): TimeEntryResponse[] {
  const existingIndex = items.findIndex((item) => item.id === entry.id);
  const shouldInclude = entryMatchesQuery(entry, query);
  const canInsert = !query.page || query.page <= 1;

  if (existingIndex === -1 && (!shouldInclude || !canInsert)) {
    return items;
  }

  const nextItems =
    existingIndex === -1
      ? [entry, ...items]
      : items.map((item) => (item.id === entry.id ? entry : item));
  const filteredItems = shouldInclude
    ? nextItems
    : nextItems.filter((item) => item.id !== entry.id);

  return filteredItems.sort(compareTimeEntriesByRecency);
}

function reconcileListResponse(
  response: TimeEntryListResponse,
  entry: TimeEntryResponse,
  query: NormalizedTimeEntryListQuery,
): TimeEntryListResponse {
  const hadEntry = response.items.some((item) => item.id === entry.id);
  const nextItems = reconcileEntries(response.items, entry, query);
  const hasEntry = nextItems.some((item) => item.id === entry.id);
  const limit = response.meta.limit;
  const nextTotal = response.meta.total +
    (hasEntry && !hadEntry ? 1 : 0) -
    (!hasEntry && hadEntry ? 1 : 0);

  return {
    ...response,
    items: nextItems.slice(0, limit),
    meta: {
      ...response.meta,
      total: nextTotal,
      totalPages: nextTotal === 0 ? 0 : Math.ceil(nextTotal / limit),
    },
  };
}

export function reconcileTimeEntryListCaches(
  queryClient: QueryClient,
  scope: UserServerStateScope,
  entry: TimeEntryResponse,
): void {
  const queries = queryClient.getQueryCache().findAll({
    queryKey: timeEntriesKeys.all(scope),
  });

  for (const query of queries) {
    const queryKey = query.queryKey;
    const currentData = query.state.data;
    const listQuery = readTimeEntryQuery(queryKey);

    if (isTimeEntryListResponse(currentData)) {
      queryClient.setQueryData(
        queryKey,
        reconcileListResponse(currentData, entry, listQuery),
      );
      continue;
    }

    if (Array.isArray(currentData)) {
      queryClient.setQueryData(
        queryKey,
        reconcileEntries(currentData, entry, listQuery),
      );
    }
  }
}

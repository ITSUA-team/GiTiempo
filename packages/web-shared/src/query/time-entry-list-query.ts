import {
  timeEntryListQuerySchema,
  type TimeEntryListQuery,
} from "@gitiempo/shared";

export function buildTimeEntryListQueryString(
  query: Partial<TimeEntryListQuery> | undefined,
): string {
  const parsed = timeEntryListQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(parsed.page));
  searchParams.set("limit", String(parsed.limit));

  if (parsed.dateFrom) {
    searchParams.set("dateFrom", parsed.dateFrom);
  }

  if (parsed.dateTo) {
    searchParams.set("dateTo", parsed.dateTo);
  }

  if (parsed.projectId) {
    searchParams.set("projectId", parsed.projectId);
  }

  if (parsed.taskId) {
    searchParams.set("taskId", parsed.taskId);
  }

  if (parsed.search) {
    searchParams.set("search", parsed.search);
  }

  return searchParams.toString();
}

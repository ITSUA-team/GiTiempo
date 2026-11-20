import type { ProjectResponse, TimeEntryListQuery } from '@gitiempo/shared';
import { INPUT_DEBOUNCE_MS } from '@gitiempo/web-shared';
import { addLocalDays, nextLocalDay, startOfLocalDay } from '@gitiempo/web-shared/time';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import {
  type LocationQuery,
  useRoute,
  useRouter,
  type Router,
  type RouteLocationNormalizedLoaded,
} from 'vue-router';
import { z } from 'zod';

import {
  buildTaskLookupSuggestions,
  isTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from './time-entry-task-lookup';

export type TimeEntryDateRange = [Date | null, Date | null] | null;
export type TimeEntryDatePickerRangeValue =
  | Date
  | (Date | null)[]
  | null
  | undefined;

function normalizeDateRange(
  value: TimeEntryDatePickerRangeValue,
): TimeEntryDateRange {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [value, null];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const startDate = value[0] ?? null;
  const endDate = value[1] ?? null;

  return startDate || endDate ? [startDate, endDate] : null;
}

/**
 * URL query filters for the Time Entries list. `dateTo` is the exclusive
 * next-day boundary produced by `nextLocalDay(endDate).toISOString()`, mirroring
 * the API contract for `GET /time-entries`.
 */
export interface TimeEntryUrlFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  projectId?: string;
  taskId?: string;
}

const MAX_URL_PAGE = 10000;

const timeEntryUrlFilterSchema = z.object({
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).max(MAX_URL_PAGE).optional(),
  projectId: z.uuid().optional(),
  taskId: z.uuid().optional(),
});

export type TimeEntryUrlFilterSchema = typeof timeEntryUrlFilterSchema;

function pickQueryStrings(query: LocationQuery): Record<string, string> {
  const strings: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    const candidates = Array.isArray(value) ? value : [value];
    const candidate = candidates.find(
      (candidate): candidate is string =>
        typeof candidate === 'string' && candidate.length > 0,
    );

    if (candidate !== undefined) {
      strings[key] = candidate;
    }
  }

  return strings;
}

function parseOptionalField<T extends z.ZodType>(
  schema: T,
  value: string | undefined,
): z.output<T> | undefined {
  if (value === undefined) {
    return undefined;
  }

  const result = schema.safeParse(value);

  return result.success ? result.data : undefined;
}

function isValidIsoDatetime(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Validates URL query parameters into Time Entry filters. Invalid values are
 * silently discarded so a corrupted deep link can never break the page.
 */
export function parseTimeEntryUrlFilters(
  query: LocationQuery,
): TimeEntryUrlFilters {
  const values = pickQueryStrings(query);
  const parsed = timeEntryUrlFilterSchema.safeParse(values);

  if (!parsed.success) {
    return parseTimeEntryUrlFiltersPermissively(values);
  }

  const filters = parsed.data as TimeEntryUrlFilters;
  const hasValidDates =
    (filters.dateFrom === undefined || isValidIsoDatetime(filters.dateFrom)) &&
    (filters.dateTo === undefined || isValidIsoDatetime(filters.dateTo));

  if (!hasValidDates) {
    return parseTimeEntryUrlFiltersPermissively(values);
  }

  if (
    filters.dateFrom !== undefined &&
    filters.dateTo !== undefined &&
    new Date(filters.dateFrom).getTime() > new Date(filters.dateTo).getTime()
  ) {
    return {
      page: filters.page,
      projectId: filters.projectId,
      taskId: filters.taskId,
    };
  }

  return filters;
}

function parseTimeEntryUrlFiltersPermissively(
  values: Record<string, string>,
): TimeEntryUrlFilters {
  const dateFrom = parseOptionalField(
    timeEntryUrlFilterSchema.shape.dateFrom,
    values.dateFrom,
  );
  const dateTo = parseOptionalField(
    timeEntryUrlFilterSchema.shape.dateTo,
    values.dateTo,
  );
  const validDateFrom =
    dateFrom !== undefined && isValidIsoDatetime(dateFrom) ? dateFrom : undefined;
  const validDateTo =
    dateTo !== undefined && isValidIsoDatetime(dateTo) ? dateTo : undefined;
  const hasReversedRange =
    validDateFrom !== undefined &&
    validDateTo !== undefined &&
    new Date(validDateFrom).getTime() > new Date(validDateTo).getTime();

  return {
    dateFrom: hasReversedRange ? undefined : validDateFrom,
    dateTo: hasReversedRange ? undefined : validDateTo,
    page: parseOptionalField(timeEntryUrlFilterSchema.shape.page, values.page),
    projectId: parseOptionalField(
      timeEntryUrlFilterSchema.shape.projectId,
      values.projectId,
    ),
    taskId: parseOptionalField(
      timeEntryUrlFilterSchema.shape.taskId,
      values.taskId,
    ),
  };
}

function createTypingDebounce() {
  let pending: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  }

  function commit(apply: () => void): void {
    cancel();
    apply();
  }

  function schedule(apply: () => void): void {
    cancel();
    pending = setTimeout(() => {
      pending = null;
      apply();
    }, INPUT_DEBOUNCE_MS);
  }

  return { cancel, commit, schedule };
}

function tryUseRouter(): Router | null {
  return useRouter() ?? null;
}

function tryUseRoute(): RouteLocationNormalizedLoaded | null {
  return useRoute() ?? null;
}

function createHydratedTaskFilterStub(
  taskId: string,
  projectId: string,
): TaskLookupOption {
  return {
    githubIssue: null,
    id: taskId,
    isActive: true,
    projectId,
    title: '',
  };
}

export interface UseTimeEntryFiltersOptions {
  route?: RouteLocationNormalizedLoaded;
  router?: Router;
}

export function useTimeEntryFilters(options: UseTimeEntryFiltersOptions = {}) {
  const route = options.route ?? tryUseRoute();
  const router = options.router ?? tryUseRouter();
  const currentPage = ref(1);
  const pageSize = ref(20);
  const selectedDateRange = shallowRef<TimeEntryDateRange>(null);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const appliedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const projectFilterDebounce = createTypingDebounce();
  const taskFilterDebounce = createTypingDebounce();

  const selectedTaskId = computed(() =>
    isTaskLookupOption(appliedTaskFilter.value)
      ? appliedTaskFilter.value.id
      : null,
  );
  const entryListQuery = computed<Partial<TimeEntryListQuery>>(() => {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const searchValue =
      typeof appliedTaskFilter.value === 'string'
        ? appliedTaskFilter.value.trim()
        : '';

    return {
      dateFrom: startDate ? startOfLocalDay(startDate).toISOString() : undefined,
      dateTo: endDate ? nextLocalDay(endDate).toISOString() : undefined,
      limit: pageSize.value,
      page: currentPage.value,
      projectId: selectedProjectId.value ?? undefined,
      search: searchValue.length > 0 ? searchValue : undefined,
      taskId: selectedTaskId.value ?? undefined,
    };
  });

  function resetPagination(): void {
    currentPage.value = 1;
    syncUrl('replace');
  }

  function buildUrlFilterQuery(): Record<string, string> {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const query: Record<string, string> = {};

    if (startDate) {
      query.dateFrom = startOfLocalDay(startDate).toISOString();
    }

    if (endDate) {
      query.dateTo = nextLocalDay(endDate).toISOString();
    }

    if (selectedProjectId.value) {
      query.projectId = selectedProjectId.value;
    }

    if (isTaskLookupOption(appliedTaskFilter.value)) {
      query.taskId = appliedTaskFilter.value.id;
    }

    if (currentPage.value > 1) {
      query.page = String(currentPage.value);
    }

    return query;
  }

  function syncUrl(mode: 'push' | 'replace'): void {
    if (!router) {
      return;
    }

    const query = buildUrlFilterQuery();
    const navigation =
      mode === 'push'
        ? router.push({ query })
        : router.replace({ query });

    void navigation.catch(() => undefined);
  }

  function applyValidatedUrlFilters(filters: TimeEntryUrlFilters): void {
    projectFilterDebounce.cancel();
    taskFilterDebounce.cancel();
    currentPage.value = filters.page ?? 1;
    selectedProjectId.value = filters.projectId ?? null;

    const startDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const endDate = filters.dateTo
      ? addLocalDays(new Date(filters.dateTo), -1)
      : null;
    selectedDateRange.value = startDate || endDate ? [startDate, endDate] : null;

    const taskFilter = filters.taskId
      ? createHydratedTaskFilterStub(filters.taskId, filters.projectId ?? '')
      : null;
    selectedTaskFilter.value = taskFilter;
    appliedTaskFilter.value = taskFilter;
    filterTaskSuggestions.value = [];
  }

  function hydrateFromUrl(): void {
    if (!route) {
      return;
    }

    applyValidatedUrlFilters(parseTimeEntryUrlFilters(route.query));
  }

  const isUrlHydrated = ref(false);

  function matchesUrlQuery(query: LocationQuery): boolean {
    const applied = buildUrlFilterQuery();
    const keys = new Set([...Object.keys(query), ...Object.keys(applied)]);

    for (const key of keys) {
      if ((query[key] ?? undefined) !== applied[key]) {
        return false;
      }
    }

    return true;
  }

  function applyFiltersFromNavigation(source: LocationQuery): void {
    applyValidatedUrlFilters(parseTimeEntryUrlFilters(source));
    isUrlHydrated.value = true;
  }

  function setPage(page: number): void {
    currentPage.value = page;
    syncUrl('replace');
  }

  function setDateRange(range: TimeEntryDatePickerRangeValue): void {
    selectedDateRange.value = normalizeDateRange(range);
    syncUrl('replace');
  }

  function applyProjectId(projectId: string | null): void {
    selectedProjectId.value = projectId;
    taskFilterDebounce.cancel();
    selectedTaskFilter.value = null;
    appliedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
    currentPage.value = 1;
    syncUrl('replace');
  }

  function setProjectValue(value: ProjectResponse | string | null): void {
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
        projectFilterDebounce.schedule(() => applyProjectId(null));
      }

      return;
    }

    projectFilterDebounce.commit(() => applyProjectId(value?.id ?? null));
  }

  function applyTaskFilter(value: TaskLookupValue): void {
    appliedTaskFilter.value = value;
    currentPage.value = 1;
    syncUrl('replace');
  }

  function setTaskValue(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;

    if (typeof value === 'string') {
      taskFilterDebounce.schedule(() => applyTaskFilter(value));
      return;
    }

    taskFilterDebounce.commit(() => applyTaskFilter(value));
  }

  function updateTaskSuggestions(
    query: string,
    options: TaskLookupOption[],
  ): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
  }

  hydrateFromUrl();
  isUrlHydrated.value = true;

  onScopeDispose(() => {
    projectFilterDebounce.cancel();
    taskFilterDebounce.cancel();
  });

  return {
    applyFiltersFromNavigation,
    currentPage,
    entryListQuery,
    filterTaskSuggestions,
    isUrlHydrated,
    matchesUrlQuery,
    pageSize,
    resetPagination,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    selectedTaskId,
    setDateRange,
    setPage,
    setProjectValue,
    setTaskValue,
    updateTaskSuggestions,
  };
}

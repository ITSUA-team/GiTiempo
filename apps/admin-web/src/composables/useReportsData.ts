import {
  computed,
  onMounted,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import type {
  ProjectListResponse,
  ProjectMember,
  ProjectResponse,
  TimeEntryListQuery,
  TimeEntryResponse,
} from '@gitiempo/shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import {
  adminReportsClient,
  type AdminReportsClient,
} from '@/services/admin-reports-client';

export type ReportGroupBy = 'project' | 'member';
export type ReportDateRange = [Date | null, Date | null] | null;
export type ReportHoursFilter = 'any' | 'gt0' | 'gte8' | 'gte40';
export type ReportBillableFilter = 'any' | 'withBillable' | 'withoutBillable';

export interface ReportFilterOption {
  label: string;
  value: string;
}

export interface ReportRow {
  id: string;
  projectIds: string[];
  projectName: string;
  memberIds: string[];
  memberName: string;
  totalSeconds: number;
  billableSeconds: number;
  billableShare: number | null;
  entryCount: number;
}

export interface ReportSummary {
  totalSeconds: number;
  billableSeconds: number;
  billableShare: number | null;
  memberCount: number;
  avgPerMemberSeconds: number;
  topProjectName: string;
}

export interface ReportTableFilters {
  global: string;
  projectId: string | null;
  memberId: string | null;
  hours: ReportHoursFilter;
  billable: ReportBillableFilter;
}

interface UseReportsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
  reportsClient?: AdminReportsClient;
  /* eslint-disable no-unused-vars */
  onError?: (message: string, error: unknown, action: string) => void;
  /* eslint-enable no-unused-vars */
}

interface GroupAccumulator {
  id: string;
  projectIds: Set<string>;
  projectNames: Set<string>;
  memberIds: Set<string>;
  memberNames: Set<string>;
  totalSeconds: number;
  billableSeconds: number;
  entryCount: number;
}

const pageLimit = 100;

export function getDefaultReportDateRange(now = new Date()): ReportDateRange {
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ];
}

export function createDefaultReportTableFilters(): ReportTableFilters {
  return {
    global: '',
    projectId: null,
    memberId: null,
    hours: 'any',
    billable: 'any',
  };
}

export function formatReportDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatReportPercent(value: number | null): string {
  if (value === null) {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
}

export function formatReportDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatUserName(user: {
  displayName: string | null;
  email: string;
}): string {
  return user.displayName?.trim() || user.email;
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

function addProjectMemberOption(
  options: Map<string, ReportFilterOption>,
  member: ProjectMember,
): void {
  options.set(member.userId, {
    label: member.displayName?.trim() || member.email,
    value: member.userId,
  });
}

export function deriveProjectOptions(
  projects: ProjectListResponse,
): ReportFilterOption[] {
  return sortByLabel(
    projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
  );
}

export function deriveMemberOptions(
  projects: ProjectListResponse,
  entries: TimeEntryResponse[],
): ReportFilterOption[] {
  const options = new Map<string, ReportFilterOption>();

  for (const project of projects) {
    for (const member of project.members) {
      addProjectMemberOption(options, member);
    }
  }

  for (const entry of entries) {
    options.set(entry.user.id, {
      label: formatUserName(entry.user),
      value: entry.user.id,
    });
  }

  return sortByLabel([...options.values()]);
}

export function filterEntriesByMember(
  entries: TimeEntryResponse[],
  memberId: string | null,
): TimeEntryResponse[] {
  if (!memberId) {
    return entries;
  }

  return entries.filter((entry) => entry.user.id === memberId);
}

function getEntryDuration(entry: TimeEntryResponse): number {
  return Math.max(0, entry.durationSeconds ?? 0);
}

function getOrCreateAccumulator(
  groups: Map<string, GroupAccumulator>,
  id: string,
): GroupAccumulator {
  const existing = groups.get(id);

  if (existing) {
    return existing;
  }

  const next: GroupAccumulator = {
    id,
    projectIds: new Set<string>(),
    projectNames: new Set<string>(),
    memberIds: new Set<string>(),
    memberNames: new Set<string>(),
    totalSeconds: 0,
    billableSeconds: 0,
    entryCount: 0,
  };

  groups.set(id, next);
  return next;
}

export function deriveReportRows(
  entries: TimeEntryResponse[],
  groupBy: ReportGroupBy,
): ReportRow[] {
  const groups = new Map<string, GroupAccumulator>();

  for (const entry of entries) {
    const groupId = groupBy === 'project' ? entry.project.id : entry.user.id;
    const group = getOrCreateAccumulator(groups, groupId);
    const durationSeconds = getEntryDuration(entry);

    group.projectIds.add(entry.project.id);
    group.projectNames.add(entry.project.name);
    group.memberIds.add(entry.user.id);
    group.memberNames.add(formatUserName(entry.user));
    group.totalSeconds += durationSeconds;
    group.billableSeconds += entry.isBillable ? durationSeconds : 0;
    group.entryCount += 1;
  }

  return [...groups.values()]
    .map((group) => {
      const projectNames = [...group.projectNames].sort((a, b) => a.localeCompare(b));
      const memberNames = [...group.memberNames].sort((a, b) => a.localeCompare(b));

      return {
        id: group.id,
        projectIds: [...group.projectIds],
        projectName:
          groupBy === 'project'
            ? projectNames[0] ?? 'Unknown project'
            : formatCountLabel(projectNames.length, 'project', 'projects'),
        memberIds: [...group.memberIds],
        memberName:
          groupBy === 'member'
            ? memberNames[0] ?? 'Unknown member'
            : formatCountLabel(memberNames.length, 'member', 'members'),
        totalSeconds: group.totalSeconds,
        billableSeconds: group.billableSeconds,
        billableShare:
          group.totalSeconds > 0 ? group.billableSeconds / group.totalSeconds : null,
        entryCount: group.entryCount,
      } satisfies ReportRow;
    })
    .sort((a, b) => {
      const primary = a.projectName.localeCompare(b.projectName);
      return primary === 0 ? a.memberName.localeCompare(b.memberName) : primary;
    });
}

export function deriveReportSummary(entries: TimeEntryResponse[]): ReportSummary {
  let totalSeconds = 0;
  let billableSeconds = 0;
  const memberIds = new Set<string>();
  const projectTotals = new Map<string, { name: string; seconds: number }>();

  for (const entry of entries) {
    const durationSeconds = getEntryDuration(entry);

    totalSeconds += durationSeconds;
    billableSeconds += entry.isBillable ? durationSeconds : 0;
    memberIds.add(entry.user.id);

    const projectTotal = projectTotals.get(entry.project.id) ?? {
      name: entry.project.name,
      seconds: 0,
    };
    projectTotal.seconds += durationSeconds;
    projectTotals.set(entry.project.id, projectTotal);
  }

  const topProject = [...projectTotals.values()].sort(
    (a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name),
  )[0];

  return {
    totalSeconds,
    billableSeconds,
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
    memberCount: memberIds.size,
    avgPerMemberSeconds: memberIds.size > 0 ? totalSeconds / memberIds.size : 0,
    topProjectName: topProject?.name ?? 'None',
  };
}

export function filterReportRows(
  rows: ReportRow[],
  filters: ReportTableFilters,
): ReportRow[] {
  const search = filters.global.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.projectId && !row.projectIds.includes(filters.projectId)) {
      return false;
    }

    if (filters.memberId && !row.memberIds.includes(filters.memberId)) {
      return false;
    }

    if (filters.hours === 'gt0' && row.totalSeconds <= 0) {
      return false;
    }

    if (filters.hours === 'gte8' && row.totalSeconds < 8 * 60 * 60) {
      return false;
    }

    if (filters.hours === 'gte40' && row.totalSeconds < 40 * 60 * 60) {
      return false;
    }

    if (filters.billable === 'withBillable' && row.billableSeconds <= 0) {
      return false;
    }

    if (filters.billable === 'withoutBillable' && row.billableSeconds > 0) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      row.projectName,
      row.memberName,
      formatReportDuration(row.totalSeconds),
      formatReportDuration(row.billableSeconds),
      formatReportPercent(row.billableShare),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
}

export function escapeReportCsvCell(value: string | number): string {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReportsCsv(rows: ReportRow[]): string {
  const header = [
    'Project',
    'Member',
    'Tracked Hours',
    'Billable Hours',
    'Billable Share',
    'Entry Count',
  ];
  const lines = [header.map(escapeReportCsvCell).join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.projectName,
        row.memberName,
        formatReportDuration(row.totalSeconds),
        formatReportDuration(row.billableSeconds),
        formatReportPercent(row.billableShare),
        row.entryCount,
      ]
        .map(escapeReportCsvCell)
        .join(','),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function createReportsCsvDownload(
  rows: ReportRow[],
  now = new Date(),
): { csv: string; filename: string } {
  return {
    csv: buildReportsCsv(rows),
    filename: `gitiempo-reports-${formatReportDateYmd(now)}.csv`,
  };
}

export function downloadReportsCsv(rows: ReportRow[], now = new Date()): string {
  const { csv, filename } = createReportsCsvDownload(rows, now);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  return filename;
}

function startOfDayIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).toISOString();
}

function nextDayStartIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).toISOString();
}

export function toReportDateQuery(
  dateRange: ReportDateRange,
): Pick<TimeEntryListQuery, 'dateFrom' | 'dateTo'> {
  const [dateFrom, dateTo] = dateRange ?? [];
  const query: Pick<TimeEntryListQuery, 'dateFrom' | 'dateTo'> = {};

  if (dateFrom) {
    query.dateFrom = startOfDayIso(dateFrom);
  }

  if (dateTo) {
    query.dateTo = nextDayStartIso(dateTo);
  }

  return query;
}

function sortProjects(projects: ProjectListResponse): ProjectListResponse {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

function getVisibleProjectsForScope(
  projects: ProjectListResponse,
  projectId: string | null,
): ProjectResponse[] {
  if (!projectId) {
    return projects.filter(
      (project) => project.isActive && project.totalHours > 0,
    );
  }

  return projects.filter((project) => project.id === projectId);
}

function getReportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load reports';

  if (/throttler|too many requests/i.test(message)) {
    return 'Too many report requests. Select a project and shorter date range, then try again.';
  }

  return message;
}

export function useReportsData({
  accessToken,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  onError,
}: UseReportsDataOptions) {
  const projects = shallowRef<ProjectListResponse>([]);
  const entries = shallowRef<TimeEntryResponse[]>([]);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedMemberId = shallowRef<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const groupBy = shallowRef<ReportGroupBy>('project');
  const loading = shallowRef(true);
  const initialLoaded = shallowRef(false);
  const loadError = shallowRef<string | null>(null);

  let requestId = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const projectOptions = computed(() => deriveProjectOptions(projects.value));
  const memberOptions = computed(() =>
    deriveMemberOptions(projects.value, entries.value),
  );
  const memberScopedEntries = computed(() =>
    filterEntriesByMember(entries.value, selectedMemberId.value),
  );
  const rows = computed(() =>
    deriveReportRows(memberScopedEntries.value, groupBy.value),
  );
  const summary = computed(() => deriveReportSummary(memberScopedEntries.value));
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);
  const isEmpty = computed(
    () =>
      initialLoaded.value &&
      !loading.value &&
      loadError.value === null &&
      rows.value.length === 0,
  );

  async function fetchEntriesForScope(
    token: string,
    visibleProjects: ProjectListResponse,
  ): Promise<TimeEntryResponse[]> {
    const targetProjects = getVisibleProjectsForScope(
      visibleProjects,
      selectedProjectId.value,
    );
    const dateQuery = toReportDateQuery(dateRange.value);
    const nextEntries: TimeEntryResponse[] = [];

    for (const project of targetProjects) {
      let page = 1;
      let totalPages = 1;

      do {
        const response = await reportsClient.listProjectEntries(token, project.id, {
          ...dateQuery,
          page,
          limit: pageLimit,
        });

        nextEntries.push(...response.items);
        totalPages = Math.max(1, response.meta.totalPages);
        page += 1;
      } while (page <= totalPages);
    }

    return nextEntries;
  }

  async function loadReports({
    action,
    reloadProjects,
    setInitialLoaded,
  }: {
    action: string;
    reloadProjects: boolean;
    setInitialLoaded: boolean;
  }): Promise<void> {
    const token = accessToken.value;

    if (!token) {
      loading.value = false;
      return;
    }

    const currentRequestId = requestId + 1;
    requestId = currentRequestId;
    loading.value = true;
    loadError.value = null;

    try {
      let nextProjects = projects.value;

      if (reloadProjects) {
        nextProjects = sortProjects(await projectsClient.listProjects(token));

        if (currentRequestId !== requestId) {
          return;
        }

        projects.value = nextProjects;
      }

      if (
        selectedProjectId.value !== null &&
        !nextProjects.some((project) => project.id === selectedProjectId.value)
      ) {
        selectedProjectId.value = null;
      }

      const nextEntries = await fetchEntriesForScope(token, nextProjects);

      if (currentRequestId !== requestId) {
        return;
      }

      entries.value = nextEntries;
      if (setInitialLoaded) {
        initialLoaded.value = true;
      }
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      const message = getReportErrorMessage(error);
      loadError.value = message;
      onError?.(message, error, action);
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false;
      }
    }
  }

  function clearDebounceTimer(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleEntriesRefresh(): void {
    if (!initialLoaded.value) {
      return;
    }

    clearDebounceTimer();
    debounceTimer = setTimeout(() => {
      void loadReports({
        action: 'refresh-reports',
        reloadProjects: false,
        setInitialLoaded: false,
      });
    }, 300);
  }

  async function refresh(): Promise<void> {
    clearDebounceTimer();
    await loadReports({
      action: initialLoaded.value ? 'refresh-reports' : 'load-reports',
      reloadProjects: true,
      setInitialLoaded: !initialLoaded.value,
    });
  }

  watch(
    [
      selectedProjectId,
      () => dateRange.value?.[0]?.getTime() ?? null,
      () => dateRange.value?.[1]?.getTime() ?? null,
    ],
    scheduleEntriesRefresh,
  );

  watch(memberOptions, (options) => {
    if (
      selectedMemberId.value &&
      !options.some((option) => option.value === selectedMemberId.value)
    ) {
      selectedMemberId.value = null;
    }
  });

  onMounted(refresh);

  return {
    dateRange,
    entries,
    groupBy,
    initialLoaded,
    isEmpty,
    isInitialLoading,
    loadError,
    loading,
    memberOptions,
    projectOptions,
    projects,
    refresh,
    rows,
    selectedMemberId,
    selectedProjectId,
    summary,
  };
}

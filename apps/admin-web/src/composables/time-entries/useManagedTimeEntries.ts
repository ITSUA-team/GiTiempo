import type { TimeEntryListResponse, TimeEntryResponse } from '@gitiempo/shared';
import { getErrorMessage } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import { replaceEqualDeep } from '@tanstack/vue-query';
import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';

import type { AdminTimeEntriesClient, ManagementMember, ManagementProject } from '@/services/admin-time-entries-client';

export function useManagedTimeEntries(scope: Readonly<Ref<string>>, client: AdminTimeEntriesClient) {
  const projects = shallowRef<ManagementProject[]>([]);
  const members = shallowRef<ManagementMember[]>([]);
  const eligibleMembers = shallowRef<ManagementMember[]>([]);
  const eligibleMembersError = ref('');
  const memberError = ref('');
  const list = shallowRef<TimeEntryListResponse>();
  const projectId = ref<string>();
  const memberId = ref<string>();
  const search = ref('');
  const dates = ref<(Date | null)[] | null>(null);
  const page = ref(1);
  const loadingProjects = ref(false);
  const loadingEntries = ref(false);
  const projectError = ref('');
  const projectAccessError = ref('');
  const checkingProjectAccess = ref(false);
  const entriesError = ref('');
  let projectRequest = 0;
  let memberRequest = 0;
  let listRequest = 0;
  let eligibleMembersRequest = 0;
  let recheckedProjectId: string | undefined;

  const project = computed(() => projects.value.find(option => option.id === projectId.value));
  const dateFrom = computed(() => {
    const start = dates.value?.[0];
    if (!start) return undefined;
    return new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
  });
  const dateTo = computed(() => {
    const end = dates.value?.[1];
    if (!end) return undefined;
    return new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString();
  });

  const entryQuery = computed(() => ({
    selected: projectId.value,
    scope: scope.value,
    page: page.value,
    filters: {
      userId: memberId.value ?? undefined,
      search: search.value.trim() || undefined,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    },
  }));
  let loadedQuery: typeof entryQuery.value | undefined;
  let pendingQuery: typeof entryQuery.value | undefined;

  async function loadProjects(recheckAccess = false) {
    const request = ++projectRequest;
    const selected = projectId.value;
    const current = () => request === projectRequest;
    loadingProjects.value = Boolean(scope.value) && !recheckAccess;
    if (recheckAccess) checkingProjectAccess.value = true;
    projectError.value = '';
    if (!scope.value) return false;
    try {
      const items = await client.projects(current);
      if (!current() || (recheckAccess && selected !== projectId.value)) return false;
      projects.value = items;
      if (selected === projectId.value) projectAccessError.value = '';
      if (!items.some(item => item.id === projectId.value)) projectId.value = items[0]?.id;
      return selected === projectId.value;
    } catch (error) {
      if (!current()) return false;
      if (recheckAccess) {
        if (selected !== projectId.value) return false;
        if (!isApiErrorStatus(error, [401, 403])) {
          projectAccessError.value = getErrorMessage(error, 'Unable to verify project access.');
          return false;
        }
        clearProjects();
      }
      projectError.value = getErrorMessage(error, 'Unable to load projects.');
      return false;
    } finally {
      if (current()) {
        loadingProjects.value = false;
        if (recheckAccess) checkingProjectAccess.value = false;
      }
    }
  }

  function clearProjects() {
    projects.value = [];
    projectId.value = undefined;
  }

  function reloadScope() {
    clearProjects();
    return loadProjects();
  }

  function retryProjects() {
    recheckedProjectId = undefined;
    return loadProjects();
  }

  function recheckProjectAccess() {
    if (!projectId.value || checkingProjectAccess.value) return Promise.resolve(false);
    return loadProjects(true);
  }

  function handleReadFailure(error: unknown, target: Ref<string>, fallback: string) {
    if (!isApiErrorStatus(error, [401, 403, 404])) {
      target.value = getErrorMessage(error, fallback);
      return;
    }
    if (recheckedProjectId === projectId.value) {
      clearProjects();
      projectError.value = getErrorMessage(error, 'Unable to access the selected project.');
      return;
    }
    recheckedProjectId = projectId.value;
    void reloadScope();
  }

  async function loadMembers() {
    const request = ++memberRequest;
    const selected = projectId.value;
    const current = () => request === memberRequest && selected === projectId.value;
    memberError.value = '';
    if (!selected) return;
    try {
      const items = await client.members(selected, 'filter', current);
      if (current()) members.value = items;
    } catch (error) {
      if (current()) handleReadFailure(error, memberError, 'Unable to load member filters.');
    }
  }

  async function loadEligibleMembers() {
    const request = ++eligibleMembersRequest;
    const selected = project.value;
    const current = () => request === eligibleMembersRequest && selected?.id === projectId.value;
    eligibleMembersError.value = '';
    if (!selected?.isActive) return;
    try {
      const items = await client.members(selected.id, 'create', current);
      if (current()) eligibleMembers.value = items;
    } catch (error) {
      if (current()) handleReadFailure(error, eligibleMembersError, 'Unable to load eligible members.');
    }
  }

  async function loadEntries(keepRows = false) {
    const request = ++listRequest;
    const query = entryQuery.value;
    const { selected } = query;
    const current = () => request === listRequest && query === entryQuery.value;
    const retained = keepRows && loadedQuery === query ? list.value : undefined;
    pendingQuery = selected ? query : undefined;
    loadingEntries.value = Boolean(selected && !retained);
    if (!selected) return;
    try {
      const result = await client.list(selected, query.page, query.filters);
      if (!current()) return;
      if (page.value > Math.max(1, result.meta.totalPages)) {
        page.value = Math.max(1, result.meta.totalPages);
        return;
      }
      loadedQuery = query;
      if (retained) {
        const previousById = new Map(retained.items.map(entry => [entry.id, entry]));
        list.value = {
          ...result,
          items: result.items.map(entry => replaceEqualDeep(previousById.get(entry.id), entry)),
        };
      } else {
        list.value = result;
      }
    } catch (error) {
      if (!current()) return;
      if (!retained) list.value = undefined;
      handleReadFailure(error, entriesError, 'Unable to load time entries.');
    } finally {
      if (current()) {
        pendingQuery = undefined;
        loadingEntries.value = false;
      }
    }
  }

  function refreshEntries() {
    entriesError.value = '';
    void loadEntries(true);
  }

  function applyUpdatedEntry(previous: TimeEntryResponse, updated: TimeEntryResponse) {
    const query = entryQuery.value;
    const loaded = list.value;
    const movedProject = previous.projectId !== updated.projectId;
    if (movedProject || previous.userId !== updated.userId) {
      void loadMembers();
      void loadEligibleMembers();
    }
    const affectsPage = previous.startedAt !== updated.startedAt
      || (query.filters.search && previous.task.title !== updated.task.title);
    if (!loaded || loadedQuery !== query || pendingQuery === query) {
      refreshEntries();
      return false;
    }
    if (!loaded.items.some(entry => entry.id === updated.id)) return false;
    if (movedProject || (query.filters.userId && query.filters.userId !== updated.userId)) {
      const total = loaded.meta.total - 1;
      list.value = {
        items: loaded.items.filter(entry => entry.id !== updated.id),
        meta: { ...loaded.meta, total, totalPages: Math.ceil(total / loaded.meta.limit) },
      };
      refreshEntries();
      return false;
    }
    if (affectsPage) {
      refreshEntries();
      return false;
    }
    list.value = {
      ...loaded,
      items: loaded.items.map(entry => entry.id === updated.id ? updated : entry),
    };
    return true;
  }

  function refresh() {
    recheckedProjectId = undefined;
    entriesError.value = '';
    void loadMembers();
    void loadEligibleMembers();
    void loadEntries();
  }

  watch(projectId, () => {
    checkingProjectAccess.value = false;
    projectAccessError.value = '';
    list.value = undefined;
    members.value = [];
    eligibleMembers.value = [];
    memberId.value = undefined;
    page.value = 1;
    entriesError.value = '';
    void loadMembers();
    void loadEligibleMembers();
  }, { flush: 'sync' });
  watch([memberId, search, dateFrom, dateTo], () => { page.value = 1; }, { flush: 'sync' });
  watch(entryQuery, () => {
    entriesError.value = '';
    void loadEntries();
  });
  watch(scope, () => {
    recheckedProjectId = undefined;
    listRequest += 1;
    memberRequest += 1;
    eligibleMembersRequest += 1;
    list.value = undefined;
    members.value = [];
    memberId.value = undefined;
    search.value = '';
    dates.value = null;
    void reloadScope();
  }, { immediate: true, flush: 'sync' });

  onScopeDispose(() => {
    projectRequest += 1;
    memberRequest += 1;
    eligibleMembersRequest += 1;
    listRequest += 1;
  });

  return {
    projects, project, projectId, members, memberId, search, dates, page, list,
    loadingProjects, loadingEntries, projectError, projectAccessError, checkingProjectAccess, entriesError, memberError,
    eligibleMembers, eligibleMembersError, loadEligibleMembers, loadMembers,
    retryProjects, reloadScope, recheckProjectAccess, refresh, refreshEntries, applyUpdatedEntry,
  };
}

import type { ProjectListResponse, WorkspaceMemberListResponse } from '@gitiempo/shared';
import { computed, type ComputedRef, type Ref } from 'vue';

import {
  deriveMemberOptions,
  deriveProjectOptions,
  deriveWorkspaceMemberOptions,
} from '@/lib/report-view-model';

import { sortReportProjects } from './report-data-helpers';

interface UseReportOptionsOptions {
  isAdminScope: ComputedRef<boolean>;
  members: ComputedRef<WorkspaceMemberListResponse>;
  projects: ComputedRef<ProjectListResponse>;
  selectedMemberId: Ref<string | null>;
  selectedProjectId: Ref<string | null>;
}

export function useReportOptions({
  isAdminScope,
  members,
  projects: sourceProjects,
  selectedMemberId,
  selectedProjectId,
}: UseReportOptionsOptions) {
  const projects = computed(() => sortReportProjects(sourceProjects.value));
  const projectOptions = computed(() => deriveProjectOptions(projects.value));
  const projectMemberOptions = computed(() => deriveMemberOptions(projects.value));
  const workspaceMemberOptions = computed(() =>
    deriveWorkspaceMemberOptions(members.value),
  );
  const memberOptions = computed(() =>
    isAdminScope.value ? workspaceMemberOptions.value : projectMemberOptions.value,
  );

  function syncSelectedFiltersWithOptions(): void {
    if (
      selectedProjectId.value &&
      !projectOptions.value.some((option) => option.value === selectedProjectId.value)
    ) {
      selectedProjectId.value = null;
    }

    if (
      selectedMemberId.value &&
      !memberOptions.value.some((option) => option.value === selectedMemberId.value)
    ) {
      selectedMemberId.value = null;
    }
  }

  return {
    memberOptions,
    projectOptions,
    projects,
    syncSelectedFiltersWithOptions,
  };
}

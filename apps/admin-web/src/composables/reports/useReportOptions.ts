import type { ProjectListResponse, WorkspaceMemberListResponse } from '@gitiempo/shared';
import { computed, type ComputedRef } from 'vue';

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
}

export function useReportOptions({
  isAdminScope,
  members,
  projects: sourceProjects,
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

  return {
    memberOptions,
    projectOptions,
    projects,
  };
}

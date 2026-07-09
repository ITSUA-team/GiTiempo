import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  AddWorkspaceGitHubOrganizationInput,
  GitHubConnectionStatusResponse,
  GitHubOwnerListResponse,
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  TimeReportExportQuery,
  TimeReportQuery,
  TimeReportResponse,
  UpdateWorkspaceInput,
  UpdateWorkspaceSettingsInput,
  WorkspaceGitHubOrganizationListResponse,
  WorkspaceGitHubOrganizationResponse,
  WorkspaceInviteListResponse,
  WorkspaceMemberListResponse,
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
  adminMembersKeys,
  adminMutationInvalidationKeys,
  adminProjectsKeys,
  adminSettingsKeys,
  reportsKeys,
  type AdminServerStateScope,
} from '@/lib/query-keys';

type QueryKey = readonly unknown[];

interface ReportsCsvExport {
  blob: Blob;
  filename: string;
}

interface AdminProjectsClient {
  getManagementSummary(): Promise<ManagementProjectSummaryResponse>;
  listProjects(): Promise<ProjectListResponse>;
}

interface ExportTimeReportClient {
  exportTimeReport(
    query?: Partial<TimeReportExportQuery>,
  ): Promise<ReportsCsvExport>;
}

interface GitHubConnectionStatusClient {
  getGitHubConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
}

interface GitHubOrganizationsClient {
  listAvailableGitHubOrganizations(): Promise<GitHubOwnerListResponse>;
}

interface TimeReportClient {
  getTimeReport(
    query?: Partial<TimeReportQuery>,
  ): Promise<TimeReportResponse>;
}

interface UpdateWorkspaceClient {
  updateWorkspace(
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse>;
}

interface UpdateWorkspaceSettingsClient {
  updateWorkspaceSettings(
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsResponse>;
}

interface WorkspaceClient {
  getWorkspace(): Promise<WorkspaceResponse>;
}

interface WorkspaceInvitesClient {
  listInvites(): Promise<WorkspaceInviteListResponse>;
}

interface WorkspaceMembersClient {
  listMembers(): Promise<WorkspaceMemberListResponse>;
}

interface WorkspaceSettingsClient {
  getWorkspaceSettings(): Promise<WorkspaceSettingsResponse>;
}

interface WorkspaceGitHubOrganizationsClient {
  addWorkspaceGitHubOrganization(
    input: AddWorkspaceGitHubOrganizationInput,
  ): Promise<WorkspaceGitHubOrganizationResponse>;
  listWorkspaceGitHubOrganizations(): Promise<WorkspaceGitHubOrganizationListResponse>;
  removeWorkspaceGitHubOrganization(organizationId: string): Promise<void>;
}

interface AdminScopedQueryOptions {
  enabled: MaybeRefOrGetter<boolean>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

interface AdminScopedMutationOptions {
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

interface UseAdminProjectsQueryOptions extends AdminScopedQueryOptions {
  client: Pick<AdminProjectsClient, 'listProjects'>;
}

interface UseExportTimeReportMutationOptions extends AdminScopedMutationOptions {
  client: ExportTimeReportClient;
}

interface UseGitHubConnectionStatusQueryOptions extends AdminScopedQueryOptions {
  client: GitHubConnectionStatusClient;
}

interface UseAvailableGitHubOrganizationsQueryOptions
  extends AdminScopedQueryOptions {
  client: GitHubOrganizationsClient;
}

interface UseManagementProjectSummaryQueryOptions extends AdminScopedQueryOptions {
  client: Pick<AdminProjectsClient, 'getManagementSummary'>;
}

interface UseTimeReportQueryOptions extends AdminScopedQueryOptions {
  client: TimeReportClient;
  query: MaybeRefOrGetter<Partial<TimeReportQuery>>;
}

interface UseUpdateWorkspaceMutationOptions extends AdminScopedMutationOptions {
  client: UpdateWorkspaceClient;
}

interface UseAddWorkspaceGitHubOrganizationMutationOptions
  extends AdminScopedMutationOptions {
  client: WorkspaceGitHubOrganizationsClient;
}

interface UseUpdateWorkspaceSettingsMutationOptions extends AdminScopedMutationOptions {
  client: UpdateWorkspaceSettingsClient;
}

interface UseWorkspaceInvitesQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceInvitesClient;
}

interface UseWorkspaceMembersQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceMembersClient;
}

interface UseWorkspaceQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceClient;
}

interface UseWorkspaceGitHubOrganizationsQueryOptions
  extends AdminScopedQueryOptions {
  client: WorkspaceGitHubOrganizationsClient;
}

interface UseWorkspaceSettingsQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceSettingsClient;
}

interface UseRemoveWorkspaceGitHubOrganizationMutationOptions
  extends AdminScopedMutationOptions {
  client: WorkspaceGitHubOrganizationsClient;
}

async function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: QueryKey[],
): Promise<void> {
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

function isQueryEnabled(options: AdminScopedQueryOptions): boolean {
  return Boolean(toValue(options.enabled));
}

export const useAdminProjectsQuery = (options: UseAdminProjectsQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminProjectsKeys.list(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listProjects(),
  });

export const useExportTimeReportMutation = (
  options: UseExportTimeReportMutationOptions,
) =>
  useMutation({
    mutationFn: (query: Partial<TimeReportExportQuery>) =>
      options.client.exportTimeReport(query),
  });

export const useGitHubConnectionStatusQuery = (
  options: UseGitHubConnectionStatusQueryOptions,
) =>
  useQuery({
    queryKey: computed(() =>
      adminSettingsKeys.githubConnection(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getGitHubConnectionStatus(),
  });

export const useAvailableGitHubOrganizationsQuery = (
  options: UseAvailableGitHubOrganizationsQueryOptions,
) =>
  useQuery({
    queryKey: computed(() =>
      adminSettingsKeys.availableGitHubOrganizations(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listAvailableGitHubOrganizations(),
  });

export const useAddWorkspaceGitHubOrganizationMutation = (
  options: UseAddWorkspaceGitHubOrganizationMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddWorkspaceGitHubOrganizationInput) =>
      options.client.addWorkspaceGitHubOrganization(input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useManagementProjectSummaryQuery = (
  options: UseManagementProjectSummaryQueryOptions,
) =>
  useQuery({
    queryKey: computed(() => adminProjectsKeys.summary(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getManagementSummary(),
  });

export const useTimeReportQuery = (options: UseTimeReportQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      reportsKeys.time(toValue(options.scope), toValue(options.query)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getTimeReport(toValue(options.query)),
  });

export const useUpdateWorkspaceMutation = (
  options: UseUpdateWorkspaceMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      options.client.updateWorkspace(input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useUpdateWorkspaceSettingsMutation = (
  options: UseUpdateWorkspaceSettingsMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceSettingsInput) =>
      options.client.updateWorkspaceSettings(input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useRemoveWorkspaceGitHubOrganizationMutation = (
  options: UseRemoveWorkspaceGitHubOrganizationMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      options.client.removeWorkspaceGitHubOrganization(organizationId),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useWorkspaceInvitesQuery = (options: UseWorkspaceInvitesQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminMembersKeys.invites(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listInvites(),
  });

export const useWorkspaceMembersQuery = (options: UseWorkspaceMembersQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminMembersKeys.list(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listMembers(),
  });

export const useWorkspaceQuery = (options: UseWorkspaceQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminSettingsKeys.workspace(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getWorkspace(),
  });

export const useWorkspaceGitHubOrganizationsQuery = (
  options: UseWorkspaceGitHubOrganizationsQueryOptions,
) =>
  useQuery({
    queryKey: computed(() =>
      adminSettingsKeys.workspaceGitHubOrganizations(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listWorkspaceGitHubOrganizations(),
  });

export const useWorkspaceSettingsQuery = (
  options: UseWorkspaceSettingsQueryOptions,
) =>
  useQuery({
    queryKey: computed(() => adminSettingsKeys.workspaceSettings(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getWorkspaceSettings(),
  });
